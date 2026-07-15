import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import { VOICE_PERFORMANCE_OPERATION_STATUSES } from '../domain/constants.js';
import type { VoicePerformanceOperationKind } from '../domain/constants.js';
import {
  deserializeVoicePerformance,
  serializeVoicePerformance,
  type VoicePerformance,
} from '../domain/voice-performance.js';
import type { PronunciationEntry } from '../ports/voice-performance-ports.js';

export interface VoicePerformanceOperationRecord {
  readonly id: string;
  readonly kind: VoicePerformanceOperationKind;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly languageCode: string | null;
  readonly status: (typeof VOICE_PERFORMANCE_OPERATION_STATUSES)[keyof typeof VOICE_PERFORMANCE_OPERATION_STATUSES];
  readonly artifactPath: string | null;
  readonly durationMs: number | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

export class VoicePerformanceRepository {
  constructor(private readonly db: Database.Database) {}

  saveVoicePerformance(performance: VoicePerformance): void {
    this.db
      .prepare(
        `
        INSERT INTO voice_performances (
          id, workflow_id, job_id, language_code, localized_document_id,
          performance_json, stitched_audio_path, aligned_audio_path, created_at
        ) VALUES (
          @id, @workflowId, @jobId, @languageCode, @localizedDocumentId,
          @performanceJson, @stitchedAudioPath, @alignedAudioPath, @createdAt
        )
        ON CONFLICT(workflow_id, language_code) DO UPDATE SET
          id = excluded.id,
          job_id = excluded.job_id,
          localized_document_id = excluded.localized_document_id,
          performance_json = excluded.performance_json,
          stitched_audio_path = excluded.stitched_audio_path,
          aligned_audio_path = excluded.aligned_audio_path,
          created_at = excluded.created_at
      `,
      )
      .run({
        id: performance.id,
        workflowId: performance.workflowId,
        jobId: performance.jobId,
        languageCode: performance.languageCode,
        localizedDocumentId: performance.localizedDocumentId,
        performanceJson: serializeVoicePerformance(performance),
        stitchedAudioPath: performance.stitchedAudioPath,
        alignedAudioPath: performance.alignedAudioPath,
        createdAt: performance.createdAt,
      });

    for (const segment of performance.segments) {
      this.registerSegmentArtifact({
        workflowId: performance.workflowId,
        languageCode: performance.languageCode,
        segmentId: segment.id,
        artifactPath: segment.audioPath,
      });
    }
  }

  getVoicePerformance(workflowId: string, languageCode: string): VoicePerformance | null {
    const row = this.db
      .prepare(
        `
        SELECT performance_json AS performanceJson
        FROM voice_performances
        WHERE workflow_id = ? AND language_code = ?
      `,
      )
      .get(workflowId, languageCode) as { performanceJson: string } | undefined;

    if (row === undefined) {
      return null;
    }

    return deserializeVoicePerformance(row.performanceJson);
  }

  registerSegmentArtifact(input: {
    readonly workflowId: string;
    readonly languageCode: string;
    readonly segmentId: string;
    readonly artifactPath: string;
  }): void {
    this.db
      .prepare(
        `
        INSERT INTO voice_segment_artifacts (
          id, workflow_id, language_code, segment_id, artifact_path, created_at
        ) VALUES (
          @id, @workflowId, @languageCode, @segmentId, @artifactPath, @createdAt
        )
        ON CONFLICT(workflow_id, language_code, segment_id) DO UPDATE SET
          artifact_path = excluded.artifact_path,
          created_at = excluded.created_at
      `,
      )
      .run({
        id: randomUUID(),
        workflowId: input.workflowId,
        languageCode: input.languageCode,
        segmentId: input.segmentId,
        artifactPath: input.artifactPath,
        createdAt: new Date().toISOString(),
      });
  }

  listPronunciationEntries(languageCode: string): readonly PronunciationEntry[] {
    return this.db
      .prepare(
        `
        SELECT term, pronunciation, language_code AS languageCode
        FROM pronunciation_entries
        WHERE language_code = ?
      `,
      )
      .all(languageCode)
      .map((row) => {
        const entry = row as {
          term: string;
          pronunciation: string;
          languageCode: string;
        };

        return {
          term: entry.term,
          pronunciation: entry.pronunciation,
          languageCode: entry.languageCode,
        };
      });
  }

  startOperation(input: {
    readonly kind: VoicePerformanceOperationKind;
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly languageCode: string | null;
  }): VoicePerformanceOperationRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `
        INSERT INTO voice_performance_operations (
          id, kind, workflow_id, job_id, node_id, language_code, status,
          artifact_path, duration_ms, created_at, completed_at
        ) VALUES (
          @id, @kind, @workflowId, @jobId, @nodeId, @languageCode, @status,
          @artifactPath, @durationMs, @createdAt, @completedAt
        )
      `,
      )
      .run({
        id,
        kind: input.kind,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        languageCode: input.languageCode,
        status: VOICE_PERFORMANCE_OPERATION_STATUSES.RUNNING,
        artifactPath: null,
        durationMs: null,
        createdAt,
        completedAt: null,
      });

    return this.getOperation(id);
  }

  completeOperation(
    operationId: string,
    artifactPath: string,
    durationMs: number,
  ): VoicePerformanceOperationRecord {
    const completedAt = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE voice_performance_operations
        SET status = @status,
            artifact_path = @artifactPath,
            duration_ms = @durationMs,
            completed_at = @completedAt
        WHERE id = @id
      `,
      )
      .run({
        id: operationId,
        status: VOICE_PERFORMANCE_OPERATION_STATUSES.COMPLETED,
        artifactPath,
        durationMs,
        completedAt,
      });

    return this.getOperation(operationId);
  }

  failOperation(operationId: string): VoicePerformanceOperationRecord {
    const completedAt = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE voice_performance_operations
        SET status = @status,
            completed_at = @completedAt
        WHERE id = @id
      `,
      )
      .run({
        id: operationId,
        status: VOICE_PERFORMANCE_OPERATION_STATUSES.FAILED,
        completedAt,
      });

    return this.getOperation(operationId);
  }

  listOperations(workflowId: string): readonly VoicePerformanceOperationRecord[] {
    return this.db
      .prepare(
        `
        SELECT
          id,
          kind,
          workflow_id AS workflowId,
          job_id AS jobId,
          node_id AS nodeId,
          language_code AS languageCode,
          status,
          artifact_path AS artifactPath,
          duration_ms AS durationMs,
          created_at AS createdAt,
          completed_at AS completedAt
        FROM voice_performance_operations
        WHERE workflow_id = ?
        ORDER BY created_at ASC
      `,
      )
      .all(workflowId) as VoicePerformanceOperationRecord[];
  }

  private getOperation(operationId: string): VoicePerformanceOperationRecord {
    const row = this.db
      .prepare(
        `
        SELECT
          id,
          kind,
          workflow_id AS workflowId,
          job_id AS jobId,
          node_id AS nodeId,
          language_code AS languageCode,
          status,
          artifact_path AS artifactPath,
          duration_ms AS durationMs,
          created_at AS createdAt,
          completed_at AS completedAt
        FROM voice_performance_operations
        WHERE id = ?
      `,
      )
      .get(operationId) as VoicePerformanceOperationRecord | undefined;

    if (row === undefined) {
      throw new Error(`Voice performance operation "${operationId}" was not found.`);
    }

    return row;
  }
}
