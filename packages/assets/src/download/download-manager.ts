import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type Database from 'better-sqlite3';

import type { AssetRepository } from '../repository/asset-repository.js';
import type { AssetDownloadManifest } from './types.js';
import { ASSET_STATUSES, DOWNLOAD_STATUSES } from '../types.js';
import type { DownloadRecord } from '../types.js';
import {
  atomicRenameVerifiedFile,
  downloadFromManifestSources,
  probeManifestTotalBytes,
  resolveResumeOffset,
} from './download-executor.js';
import {
  createDefaultDownloadProviderRegistry,
  type DownloadProviderRegistry,
} from './download-provider-registry.js';

export interface DownloadManagerOptions {
  readonly binariesRoot: string;
  readonly providerRegistry?: DownloadProviderRegistry;
}

interface DownloadRow {
  readonly id: string;
  readonly assetId: string;
  readonly targetVersion: string;
  readonly targetPath: string;
  readonly tempPath: string;
  readonly bytesDownloaded: number;
  readonly totalBytes: number | null;
  readonly status: string;
  readonly errorMessage: string | null;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
}

const PART_FILE_SUFFIX = '.part';

function mapDownloadRow(row: DownloadRow): DownloadRecord {
  return {
    id: row.id,
    assetId: row.assetId,
    targetVersion: row.targetVersion,
    targetPath: row.targetPath,
    tempPath: row.tempPath,
    bytesDownloaded: row.bytesDownloaded,
    totalBytes: row.totalBytes,
    status: row.status as DownloadRecord['status'],
    errorMessage: row.errorMessage,
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

export class DownloadManager {
  private readonly insertDownload: Database.Statement;
  private readonly updateDownloadProgress: Database.Statement;
  private readonly updateDownloadStatus: Database.Statement;
  private readonly selectDownloadById: Database.Statement;
  private readonly selectDownloadsByAsset: Database.Statement;
  private readonly selectActiveDownloads: Database.Statement;
  private readonly providerRegistry: DownloadProviderRegistry;
  private readonly activeControllers = new Map<string, AbortController>();

  constructor(
    private readonly db: Database.Database,
    private readonly repository: AssetRepository,
    private readonly options: DownloadManagerOptions,
  ) {
    this.providerRegistry = options.providerRegistry ?? createDefaultDownloadProviderRegistry();

    this.insertDownload = db.prepare(`
      INSERT INTO downloads (
        id, asset_id, target_version, target_path, temp_path, bytes_downloaded, total_bytes,
        status, error_message, started_at, updated_at, completed_at
      ) VALUES (
        @id, @assetId, @targetVersion, @targetPath, @tempPath, @bytesDownloaded, @totalBytes,
        @status, @errorMessage, @startedAt, @updatedAt, @completedAt
      )
    `);

    this.updateDownloadProgress = db.prepare(`
      UPDATE downloads SET
        bytes_downloaded = @bytesDownloaded,
        total_bytes = @totalBytes,
        updated_at = @updatedAt
      WHERE id = @id
    `);

    this.updateDownloadStatus = db.prepare(`
      UPDATE downloads SET
        status = @status,
        error_message = @errorMessage,
        updated_at = @updatedAt,
        completed_at = @completedAt
      WHERE id = @id
    `);

    this.selectDownloadById = db.prepare(`
      SELECT
        id, asset_id AS assetId, target_version AS targetVersion, target_path AS targetPath,
        temp_path AS tempPath, bytes_downloaded AS bytesDownloaded, total_bytes AS totalBytes,
        status, error_message AS errorMessage, started_at AS startedAt, updated_at AS updatedAt,
        completed_at AS completedAt
      FROM downloads WHERE id = ?
    `);

    this.selectDownloadsByAsset = db.prepare(`
      SELECT
        id, asset_id AS assetId, target_version AS targetVersion, target_path AS targetPath,
        temp_path AS tempPath, bytes_downloaded AS bytesDownloaded, total_bytes AS totalBytes,
        status, error_message AS errorMessage, started_at AS startedAt, updated_at AS updatedAt,
        completed_at AS completedAt
      FROM downloads WHERE asset_id = ? ORDER BY started_at DESC
    `);

    this.selectActiveDownloads = db.prepare(`
      SELECT
        id, asset_id AS assetId, target_version AS targetVersion, target_path AS targetPath,
        temp_path AS tempPath, bytes_downloaded AS bytesDownloaded, total_bytes AS totalBytes,
        status, error_message AS errorMessage, started_at AS startedAt, updated_at AS updatedAt,
        completed_at AS completedAt
      FROM downloads
      WHERE status IN ('queued', 'downloading', 'verifying')
      ORDER BY started_at ASC
    `);
  }

  getBinaryPath(assetId: string, version: string, filename: string): string {
    return join(this.options.binariesRoot, assetId, version, filename);
  }

  private getTempPath(finalPath: string): string {
    return `${finalPath}${PART_FILE_SUFFIX}`;
  }

  enqueueDownload(
    assetId: string,
    targetVersion: string,
    manifest: AssetDownloadManifest,
  ): Promise<DownloadRecord> {
    const asset = this.repository.getAssetById(assetId);
    if (asset === null) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const targetPath = this.getBinaryPath(assetId, targetVersion, manifest.filename);
    const tempPath = this.getTempPath(targetPath);
    const now = new Date().toISOString();
    const download: DownloadRecord = {
      id: randomUUID(),
      assetId,
      targetVersion,
      targetPath,
      tempPath,
      bytesDownloaded: 0,
      totalBytes: null,
      status: DOWNLOAD_STATUSES.QUEUED,
      errorMessage: null,
      startedAt: now,
      updatedAt: now,
      completedAt: null,
    };

    const enqueue = this.db.transaction(() => {
      this.insertDownload.run({
        id: download.id,
        assetId: download.assetId,
        targetVersion: download.targetVersion,
        targetPath: download.targetPath,
        tempPath: download.tempPath,
        bytesDownloaded: download.bytesDownloaded,
        totalBytes: download.totalBytes,
        status: download.status,
        errorMessage: download.errorMessage,
        startedAt: download.startedAt,
        updatedAt: download.updatedAt,
        completedAt: download.completedAt,
      });

      this.repository.updateAssetMetadata(assetId, { status: ASSET_STATUSES.DOWNLOADING });
    });

    enqueue();
    return Promise.resolve(download);
  }

  async startDownload(
    downloadId: string,
    manifest: AssetDownloadManifest,
  ): Promise<DownloadRecord> {
    const download = this.getDownloadById(downloadId);
    if (download === null) {
      throw new Error(`Download not found: ${downloadId}`);
    }

    if (
      download.status !== DOWNLOAD_STATUSES.QUEUED &&
      download.status !== DOWNLOAD_STATUSES.FAILED
    ) {
      throw new Error(`Download cannot be started in status: ${download.status}`);
    }

    const controller = new AbortController();
    this.activeControllers.set(downloadId, controller);

    const now = new Date().toISOString();
    this.updateDownloadStatus.run({
      id: downloadId,
      status: DOWNLOAD_STATUSES.DOWNLOADING,
      errorMessage: null,
      updatedAt: now,
      completedAt: null,
    });

    try {
      await mkdir(dirname(download.targetPath), { recursive: true });

      const resumeFromByte = await resolveResumeOffset(download.tempPath);
      const probedTotalBytes = await probeManifestTotalBytes(
        manifest.sources,
        this.providerRegistry,
      );

      if (resumeFromByte > 0) {
        this.updateDownloadProgress.run({
          id: downloadId,
          bytesDownloaded: resumeFromByte,
          totalBytes: probedTotalBytes,
          updatedAt: new Date().toISOString(),
        });
      }

      await downloadFromManifestSources({
        manifest,
        registry: this.providerRegistry,
        tempPath: download.tempPath,
        assetId: download.assetId,
        version: download.targetVersion,
        signal: controller.signal,
        onProgress: (bytesDownloaded, totalBytes) => {
          this.updateDownloadProgress.run({
            id: downloadId,
            bytesDownloaded,
            totalBytes,
            updatedAt: new Date().toISOString(),
          });
        },
      });

      const verifyingAt = new Date().toISOString();
      this.updateDownloadStatus.run({
        id: downloadId,
        status: DOWNLOAD_STATUSES.VERIFYING,
        errorMessage: null,
        updatedAt: verifyingAt,
        completedAt: null,
      });

      const asset = this.repository.getAssetById(download.assetId);
      const expectedChecksum = manifest.checksum ?? asset?.checksum ?? null;
      const verified = await atomicRenameVerifiedFile(
        download.tempPath,
        download.targetPath,
        expectedChecksum,
      );

      const completedAt = new Date().toISOString();
      const complete = this.db.transaction(() => {
        this.updateDownloadStatus.run({
          id: downloadId,
          status: DOWNLOAD_STATUSES.COMPLETED,
          errorMessage: null,
          updatedAt: completedAt,
          completedAt,
        });

        this.repository.addVersion(download.assetId, download.targetVersion, {
          filePath: download.targetPath,
          checksum: verified.checksum,
          sizeBytes: verified.sizeBytes,
          activate: true,
        });

        this.repository.updateAssetMetadata(download.assetId, {
          filePath: download.targetPath,
          checksum: verified.checksum,
          sizeBytes: verified.sizeBytes,
          status: ASSET_STATUSES.READY,
          version: download.targetVersion,
        });
      });

      complete();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      const failedAt = new Date().toISOString();
      this.updateDownloadStatus.run({
        id: downloadId,
        status: DOWNLOAD_STATUSES.FAILED,
        errorMessage: message,
        updatedAt: failedAt,
        completedAt: failedAt,
      });
      this.repository.updateAssetMetadata(download.assetId, { status: ASSET_STATUSES.MISSING });
      throw error;
    } finally {
      this.activeControllers.delete(downloadId);
    }

    const completed = this.getDownloadById(downloadId);
    if (completed === null) {
      throw new Error(`Download not found after completion: ${downloadId}`);
    }

    return completed;
  }

  cancelDownload(downloadId: string): Promise<DownloadRecord> {
    const download = this.getDownloadById(downloadId);
    if (download === null) {
      throw new Error(`Download not found: ${downloadId}`);
    }

    const controller = this.activeControllers.get(downloadId);
    controller?.abort(new Error('Download cancelled'));

    const cancelledAt = new Date().toISOString();
    this.updateDownloadStatus.run({
      id: downloadId,
      status: DOWNLOAD_STATUSES.CANCELLED,
      errorMessage: null,
      updatedAt: cancelledAt,
      completedAt: cancelledAt,
    });

    const cancelled = this.getDownloadById(downloadId);
    if (cancelled === null) {
      throw new Error(`Download not found after cancel: ${downloadId}`);
    }

    return Promise.resolve(cancelled);
  }

  getDownloadById(downloadId: string): DownloadRecord | null {
    const row = this.selectDownloadById.get(downloadId) as DownloadRow | undefined;
    return row === undefined ? null : mapDownloadRow(row);
  }

  listDownloadsByAsset(assetId: string): readonly DownloadRecord[] {
    const rows = this.selectDownloadsByAsset.all(assetId) as DownloadRow[];
    return rows.map(mapDownloadRow);
  }

  listActiveDownloads(): readonly DownloadRecord[] {
    const rows = this.selectActiveDownloads.all() as DownloadRow[];
    return rows.map(mapDownloadRow);
  }
}
