import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type Database from 'better-sqlite3';

import { BINARIES_DIRECTORY } from '../constants.js';
import type { AssetRepository } from '../repository/asset-repository.js';
import { ASSET_STATUSES, DOWNLOAD_STATUSES } from '../types.js';
import type { DownloadRecord } from '../types.js';

export interface DownloadManagerOptions {
  readonly binariesRoot: string;
  readonly chunkSizeBytes?: number;
}

interface DownloadRow {
  readonly id: string;
  readonly assetId: string;
  readonly targetVersion: string;
  readonly targetPath: string;
  readonly bytesDownloaded: number;
  readonly totalBytes: number | null;
  readonly status: string;
  readonly errorMessage: string | null;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
}

function mapDownloadRow(row: DownloadRow): DownloadRecord {
  return {
    id: row.id,
    assetId: row.assetId,
    targetVersion: row.targetVersion,
    targetPath: row.targetPath,
    bytesDownloaded: row.bytesDownloaded,
    totalBytes: row.totalBytes,
    status: row.status as DownloadRecord['status'],
    errorMessage: row.errorMessage,
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  };
}

export interface DownloadContentProvider {
  getContent(assetId: string, version: string): Promise<Buffer>;
  getTotalBytes(assetId: string, version: string): Promise<number>;
}

export class SimulatedDownloadContentProvider implements DownloadContentProvider {
  getContent(assetId: string, version: string): Promise<Buffer> {
    const payload = `dubforge-asset:${assetId}:${version}`;
    return Promise.resolve(Buffer.from(payload, 'utf8'));
  }

  getTotalBytes(assetId: string, version: string): Promise<number> {
    return this.getContent(assetId, version).then((content) => content.byteLength);
  }
}

export class DownloadManager {
  private readonly insertDownload: Database.Statement;
  private readonly updateDownloadProgress: Database.Statement;
  private readonly updateDownloadStatus: Database.Statement;
  private readonly selectDownloadById: Database.Statement;
  private readonly selectDownloadsByAsset: Database.Statement;
  private readonly selectActiveDownloads: Database.Statement;
  private readonly chunkSizeBytes: number;

  constructor(
    private readonly db: Database.Database,
    private readonly repository: AssetRepository,
    private readonly options: DownloadManagerOptions,
    private readonly contentProvider: DownloadContentProvider = new SimulatedDownloadContentProvider(),
  ) {
    this.chunkSizeBytes = options.chunkSizeBytes ?? 4096;

    this.insertDownload = db.prepare(`
      INSERT INTO downloads (
        id, asset_id, target_version, target_path, bytes_downloaded, total_bytes,
        status, error_message, started_at, updated_at, completed_at
      ) VALUES (
        @id, @assetId, @targetVersion, @targetPath, @bytesDownloaded, @totalBytes,
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
        bytes_downloaded AS bytesDownloaded, total_bytes AS totalBytes, status,
        error_message AS errorMessage, started_at AS startedAt, updated_at AS updatedAt,
        completed_at AS completedAt
      FROM downloads WHERE id = ?
    `);

    this.selectDownloadsByAsset = db.prepare(`
      SELECT
        id, asset_id AS assetId, target_version AS targetVersion, target_path AS targetPath,
        bytes_downloaded AS bytesDownloaded, total_bytes AS totalBytes, status,
        error_message AS errorMessage, started_at AS startedAt, updated_at AS updatedAt,
        completed_at AS completedAt
      FROM downloads WHERE asset_id = ? ORDER BY started_at DESC
    `);

    this.selectActiveDownloads = db.prepare(`
      SELECT
        id, asset_id AS assetId, target_version AS targetVersion, target_path AS targetPath,
        bytes_downloaded AS bytesDownloaded, total_bytes AS totalBytes, status,
        error_message AS errorMessage, started_at AS startedAt, updated_at AS updatedAt,
        completed_at AS completedAt
      FROM downloads
      WHERE status IN ('queued', 'downloading', 'verifying')
      ORDER BY started_at ASC
    `);
  }

  getBinaryPath(assetId: string, version: string): string {
    return join(this.options.binariesRoot, BINARIES_DIRECTORY, assetId, version, 'asset.bin');
  }

  enqueueDownload(assetId: string, targetVersion: string): Promise<DownloadRecord> {
    const asset = this.repository.getAssetById(assetId);
    if (asset === null) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const targetPath = this.getBinaryPath(assetId, targetVersion);
    const now = new Date().toISOString();
    const download: DownloadRecord = {
      id: randomUUID(),
      assetId,
      targetVersion,
      targetPath,
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

  async startDownload(downloadId: string): Promise<DownloadRecord> {
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

    const now = new Date().toISOString();
    this.updateDownloadStatus.run({
      id: downloadId,
      status: DOWNLOAD_STATUSES.DOWNLOADING,
      errorMessage: null,
      updatedAt: now,
      completedAt: null,
    });

    try {
      const content = await this.contentProvider.getContent(
        download.assetId,
        download.targetVersion,
      );
      const totalBytes = content.byteLength;
      await mkdir(dirname(download.targetPath), { recursive: true });

      let bytesDownloaded = 0;
      while (bytesDownloaded < totalBytes) {
        const chunkEnd = Math.min(bytesDownloaded + this.chunkSizeBytes, totalBytes);
        const chunk = content.subarray(bytesDownloaded, chunkEnd);
        await writeFile(download.targetPath, chunk, { flag: bytesDownloaded === 0 ? 'w' : 'a' });
        bytesDownloaded = chunkEnd;

        this.updateDownloadProgress.run({
          id: downloadId,
          bytesDownloaded,
          totalBytes,
          updatedAt: new Date().toISOString(),
        });
      }

      const verifyingAt = new Date().toISOString();
      this.updateDownloadStatus.run({
        id: downloadId,
        status: DOWNLOAD_STATUSES.VERIFYING,
        errorMessage: null,
        updatedAt: verifyingAt,
        completedAt: null,
      });

      const checksum = createHash('sha256').update(content).digest('hex');
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
          checksum,
          sizeBytes: totalBytes,
          activate: true,
        });

        this.repository.updateAssetMetadata(download.assetId, {
          filePath: download.targetPath,
          checksum,
          sizeBytes: totalBytes,
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
