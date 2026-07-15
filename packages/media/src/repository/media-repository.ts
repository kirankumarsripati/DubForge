import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import { MEDIA_OPERATION_STATUSES } from '../domain/constants.js';
import type { MediaFile, MediaOperation } from '../domain/entities/media-entities.js';
import { createCodec } from '../domain/value-objects/codec.js';
import { createContainerFormat } from '../domain/value-objects/container-format.js';
import { createDuration } from '../domain/value-objects/duration.js';
import { createResolution } from '../domain/value-objects/resolution.js';
import type { MediaOperationKind } from '../domain/constants.js';

interface MediaFileRow {
  readonly id: string;
  readonly filePath: string;
  readonly filename: string;
  readonly container: string;
  readonly durationSeconds: number;
  readonly width: number;
  readonly height: number;
  readonly videoCodec: string;
  readonly audioTrackCount: number;
  readonly bitrateKbps: number;
  readonly probedAt: string;
  readonly workflowId: string | null;
  readonly jobId: string | null;
  readonly contentHash: string | null;
  readonly fileSizeBytes: number | null;
  readonly fileModifiedAtMs: number | null;
  readonly frameRate: number | null;
  readonly metadataArtifactPath: string | null;
}

interface MediaOperationRow {
  readonly id: string;
  readonly kind: string;
  readonly mediaFileId: string | null;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly status: string;
  readonly artifactPath: string | null;
  readonly durationMs: number | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

export interface CreateMediaFileInput {
  readonly filePath: string;
  readonly filename: string;
  readonly container: string;
  readonly durationSeconds: number;
  readonly width: number;
  readonly height: number;
  readonly videoCodec: string;
  readonly audioTrackCount: number;
  readonly bitrateKbps: number;
  readonly workflowId: string;
  readonly jobId: string;
  readonly contentHash?: string | null;
  readonly fileSizeBytes?: number | null;
  readonly fileModifiedAtMs?: number | null;
  readonly frameRate?: number | null;
  readonly metadataArtifactPath?: string | null;
}

export interface CreateMediaOperationInput {
  readonly kind: MediaOperationKind;
  readonly mediaFileId: string | null;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
}

function mapMediaFileRow(row: MediaFileRow): MediaFile {
  return {
    id: row.id,
    filePath: row.filePath,
    filename: row.filename,
    container: createContainerFormat(row.container),
    duration: createDuration(row.durationSeconds),
    resolution: createResolution(row.width, row.height),
    videoCodec: createCodec(row.videoCodec),
    audioTrackCount: row.audioTrackCount,
    bitrateKbps: row.bitrateKbps,
    probedAt: row.probedAt,
    workflowId: row.workflowId,
    jobId: row.jobId,
  };
}

function mapMediaOperationRow(row: MediaOperationRow): MediaOperation {
  return {
    id: row.id,
    kind: row.kind as MediaOperation['kind'],
    mediaFileId: row.mediaFileId,
    workflowId: row.workflowId,
    jobId: row.jobId,
    nodeId: row.nodeId,
    status: row.status as MediaOperation['status'],
    artifactPath: row.artifactPath,
    durationMs: row.durationMs,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}

export class MediaRepository {
  private readonly insertMediaFile: Database.Statement;
  private readonly insertMediaOperation: Database.Statement;
  private readonly updateMediaOperation: Database.Statement;
  private readonly selectMediaFileByWorkflow: Database.Statement;
  private readonly selectOperationsByWorkflow: Database.Statement;

  private readonly selectMediaFileByContentHash: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertMediaFile = db.prepare(`
      INSERT INTO media_files (
        id, file_path, filename, container, duration_seconds, width, height,
        video_codec, audio_track_count, bitrate_kbps, probed_at, workflow_id, job_id,
        content_hash, file_size_bytes, file_modified_at_ms, frame_rate, metadata_artifact_path
      ) VALUES (
        @id, @filePath, @filename, @container, @durationSeconds, @width, @height,
        @videoCodec, @audioTrackCount, @bitrateKbps, @probedAt, @workflowId, @jobId,
        @contentHash, @fileSizeBytes, @fileModifiedAtMs, @frameRate, @metadataArtifactPath
      )
    `);

    this.insertMediaOperation = db.prepare(`
      INSERT INTO media_operations (
        id, kind, media_file_id, workflow_id, job_id, node_id, status,
        artifact_path, duration_ms, created_at, completed_at
      ) VALUES (
        @id, @kind, @mediaFileId, @workflowId, @jobId, @nodeId, @status,
        @artifactPath, @durationMs, @createdAt, @completedAt
      )
    `);

    this.updateMediaOperation = db.prepare(`
      UPDATE media_operations
      SET status = @status,
          artifact_path = @artifactPath,
          duration_ms = @durationMs,
          completed_at = @completedAt
      WHERE id = @id
    `);

    this.selectMediaFileByWorkflow = db.prepare(`
      SELECT
        id,
        file_path AS filePath,
        filename,
        container,
        duration_seconds AS durationSeconds,
        width,
        height,
        video_codec AS videoCodec,
        audio_track_count AS audioTrackCount,
        bitrate_kbps AS bitrateKbps,
        probed_at AS probedAt,
        workflow_id AS workflowId,
        job_id AS jobId,
        content_hash AS contentHash,
        file_size_bytes AS fileSizeBytes,
        file_modified_at_ms AS fileModifiedAtMs,
        frame_rate AS frameRate,
        metadata_artifact_path AS metadataArtifactPath
      FROM media_files
      WHERE workflow_id = ?
      ORDER BY probed_at DESC
      LIMIT 1
    `);

    this.selectMediaFileByContentHash = db.prepare(`
      SELECT
        id,
        file_path AS filePath,
        filename,
        container,
        duration_seconds AS durationSeconds,
        width,
        height,
        video_codec AS videoCodec,
        audio_track_count AS audioTrackCount,
        bitrate_kbps AS bitrateKbps,
        probed_at AS probedAt,
        workflow_id AS workflowId,
        job_id AS jobId,
        content_hash AS contentHash,
        file_size_bytes AS fileSizeBytes,
        file_modified_at_ms AS fileModifiedAtMs,
        frame_rate AS frameRate,
        metadata_artifact_path AS metadataArtifactPath
      FROM media_files
      WHERE content_hash = ?
      ORDER BY probed_at DESC
      LIMIT 1
    `);

    this.selectOperationsByWorkflow = db.prepare(`
      SELECT
        id,
        kind,
        media_file_id AS mediaFileId,
        workflow_id AS workflowId,
        job_id AS jobId,
        node_id AS nodeId,
        status,
        artifact_path AS artifactPath,
        duration_ms AS durationMs,
        created_at AS createdAt,
        completed_at AS completedAt
      FROM media_operations
      WHERE workflow_id = ?
      ORDER BY created_at ASC
    `);
  }

  createMediaFile(input: CreateMediaFileInput): MediaFile {
    const id = randomUUID();
    const probedAt = new Date().toISOString();

    this.insertMediaFile.run({
      id,
      filePath: input.filePath,
      filename: input.filename,
      container: input.container,
      durationSeconds: input.durationSeconds,
      width: input.width,
      height: input.height,
      videoCodec: input.videoCodec,
      audioTrackCount: input.audioTrackCount,
      bitrateKbps: input.bitrateKbps,
      probedAt,
      workflowId: input.workflowId,
      jobId: input.jobId,
      contentHash: input.contentHash ?? null,
      fileSizeBytes: input.fileSizeBytes ?? null,
      fileModifiedAtMs: input.fileModifiedAtMs ?? null,
      frameRate: input.frameRate ?? null,
      metadataArtifactPath: input.metadataArtifactPath ?? null,
    });

    return mapMediaFileRow({
      id,
      filePath: input.filePath,
      filename: input.filename,
      container: input.container,
      durationSeconds: input.durationSeconds,
      width: input.width,
      height: input.height,
      videoCodec: input.videoCodec,
      audioTrackCount: input.audioTrackCount,
      bitrateKbps: input.bitrateKbps,
      probedAt,
      workflowId: input.workflowId,
      jobId: input.jobId,
      contentHash: input.contentHash ?? null,
      fileSizeBytes: input.fileSizeBytes ?? null,
      fileModifiedAtMs: input.fileModifiedAtMs ?? null,
      frameRate: input.frameRate ?? null,
      metadataArtifactPath: input.metadataArtifactPath ?? null,
    });
  }

  startOperation(input: CreateMediaOperationInput): MediaOperation {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.insertMediaOperation.run({
      id,
      kind: input.kind,
      mediaFileId: input.mediaFileId,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      status: MEDIA_OPERATION_STATUSES.RUNNING,
      artifactPath: null,
      durationMs: null,
      createdAt,
      completedAt: null,
    });

    return mapMediaOperationRow({
      id,
      kind: input.kind,
      mediaFileId: input.mediaFileId,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      status: MEDIA_OPERATION_STATUSES.RUNNING,
      artifactPath: null,
      durationMs: null,
      createdAt,
      completedAt: null,
    });
  }

  completeOperation(operationId: string, artifactPath: string, durationMs: number): MediaOperation {
    const completedAt = new Date().toISOString();

    this.updateMediaOperation.run({
      id: operationId,
      status: MEDIA_OPERATION_STATUSES.COMPLETED,
      artifactPath,
      durationMs,
      completedAt,
    });

    const row = this.db
      .prepare(
        `
        SELECT
          id,
          kind,
          media_file_id AS mediaFileId,
          workflow_id AS workflowId,
          job_id AS jobId,
          node_id AS nodeId,
          status,
          artifact_path AS artifactPath,
          duration_ms AS durationMs,
          created_at AS createdAt,
          completed_at AS completedAt
        FROM media_operations
        WHERE id = ?
      `,
      )
      .get(operationId) as MediaOperationRow | undefined;

    if (row === undefined) {
      throw new Error(`Media operation "${operationId}" was not found.`);
    }

    return mapMediaOperationRow(row);
  }

  failOperation(operationId: string): MediaOperation {
    const completedAt = new Date().toISOString();

    this.updateMediaOperation.run({
      id: operationId,
      status: MEDIA_OPERATION_STATUSES.FAILED,
      artifactPath: null,
      durationMs: null,
      completedAt,
    });

    const row = this.db
      .prepare(
        `
        SELECT
          id,
          kind,
          media_file_id AS mediaFileId,
          workflow_id AS workflowId,
          job_id AS jobId,
          node_id AS nodeId,
          status,
          artifact_path AS artifactPath,
          duration_ms AS durationMs,
          created_at AS createdAt,
          completed_at AS completedAt
        FROM media_operations
        WHERE id = ?
      `,
      )
      .get(operationId) as MediaOperationRow | undefined;

    if (row === undefined) {
      throw new Error(`Media operation "${operationId}" was not found.`);
    }

    return mapMediaOperationRow(row);
  }

  findMediaFileByWorkflow(workflowId: string): MediaFile | null {
    const row = this.selectMediaFileByWorkflow.get(workflowId) as MediaFileRow | undefined;
    return row === undefined ? null : mapMediaFileRow(row);
  }

  findMediaFileByContentHash(contentHash: string): MediaFile | null {
    const row = this.selectMediaFileByContentHash.get(contentHash) as MediaFileRow | undefined;
    return row === undefined ? null : mapMediaFileRow(row);
  }

  listOperationsByWorkflow(workflowId: string): readonly MediaOperation[] {
    const rows = this.selectOperationsByWorkflow.all(workflowId) as MediaOperationRow[];
    return rows.map(mapMediaOperationRow);
  }
}
