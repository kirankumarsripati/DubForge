import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import {
  deserializeCanonicalTranscript,
  serializeCanonicalTranscript,
  type CanonicalTranscript,
} from '../domain/canonical-transcript.js';
import { TRANSCRIPTION_OPERATION_STATUSES } from '../domain/constants.js';
import type { TranscriptionOperationKind } from '../domain/constants.js';

export interface TranscriptionOperationRecord {
  readonly id: string;
  readonly kind: TranscriptionOperationKind;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly languageCode: string | null;
  readonly status: (typeof TRANSCRIPTION_OPERATION_STATUSES)[keyof typeof TRANSCRIPTION_OPERATION_STATUSES];
  readonly artifactPath: string | null;
  readonly durationMs: number | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

export class LocalizationRepository {
  private readonly db: Database.Database;
  private readonly insertTranscript: Database.Statement;
  private readonly selectTranscriptByWorkflowLanguage: Database.Statement;
  private readonly insertOperation: Database.Statement;
  private readonly updateOperation: Database.Statement;
  private readonly selectOperationsByWorkflow: Database.Statement;

  constructor(db: Database.Database) {
    this.db = db;
    this.insertTranscript = db.prepare(`
      INSERT INTO canonical_transcripts (
        id, workflow_id, job_id, language_code, source, duration_ms,
        transcript_json, quality_score, created_at
      ) VALUES (
        @id, @workflowId, @jobId, @languageCode, @source, @durationMs,
        @transcriptJson, @qualityScore, @createdAt
      )
      ON CONFLICT(workflow_id, language_code) DO UPDATE SET
        id = excluded.id,
        job_id = excluded.job_id,
        source = excluded.source,
        duration_ms = excluded.duration_ms,
        transcript_json = excluded.transcript_json,
        quality_score = excluded.quality_score,
        created_at = excluded.created_at
    `);

    this.selectTranscriptByWorkflowLanguage = db.prepare(`
      SELECT transcript_json AS transcriptJson
      FROM canonical_transcripts
      WHERE workflow_id = ? AND language_code = ?
    `);

    this.insertOperation = db.prepare(`
      INSERT INTO transcription_operations (
        id, kind, workflow_id, job_id, node_id, language_code, status,
        artifact_path, duration_ms, created_at, completed_at
      ) VALUES (
        @id, @kind, @workflowId, @jobId, @nodeId, @languageCode, @status,
        @artifactPath, @durationMs, @createdAt, @completedAt
      )
    `);

    this.updateOperation = db.prepare(`
      UPDATE transcription_operations
      SET status = @status,
          artifact_path = @artifactPath,
          duration_ms = @durationMs,
          completed_at = @completedAt
      WHERE id = @id
    `);

    this.selectOperationsByWorkflow = db.prepare(`
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
      FROM transcription_operations
      WHERE workflow_id = ?
      ORDER BY created_at ASC
    `);
  }

  saveCanonicalTranscript(transcript: CanonicalTranscript, qualityScore: number): void {
    this.insertTranscript.run({
      id: transcript.id,
      workflowId: transcript.workflowId,
      jobId: transcript.jobId,
      languageCode: transcript.languageCode,
      source: transcript.source,
      durationMs: transcript.durationMs,
      transcriptJson: serializeCanonicalTranscript(transcript),
      qualityScore,
      createdAt: transcript.createdAt,
    });
  }

  getCanonicalTranscript(workflowId: string, languageCode: string): CanonicalTranscript | null {
    const row = this.selectTranscriptByWorkflowLanguage.get(workflowId, languageCode) as
      { transcriptJson: string } | undefined;

    if (row === undefined) {
      return null;
    }

    return deserializeCanonicalTranscript(row.transcriptJson);
  }

  startOperation(input: {
    readonly kind: TranscriptionOperationKind;
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly languageCode: string | null;
  }): TranscriptionOperationRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.insertOperation.run({
      id,
      kind: input.kind,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      languageCode: input.languageCode,
      status: TRANSCRIPTION_OPERATION_STATUSES.RUNNING,
      artifactPath: null,
      durationMs: null,
      createdAt,
      completedAt: null,
    });

    return {
      id,
      kind: input.kind,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      languageCode: input.languageCode,
      status: TRANSCRIPTION_OPERATION_STATUSES.RUNNING,
      artifactPath: null,
      durationMs: null,
      createdAt,
      completedAt: null,
    };
  }

  completeOperation(
    operationId: string,
    artifactPath: string,
    durationMs: number,
  ): TranscriptionOperationRecord {
    const completedAt = new Date().toISOString();
    this.updateOperation.run({
      id: operationId,
      status: TRANSCRIPTION_OPERATION_STATUSES.COMPLETED,
      artifactPath,
      durationMs,
      completedAt,
    });

    return this.getOperation(operationId);
  }

  failOperation(operationId: string): TranscriptionOperationRecord {
    const completedAt = new Date().toISOString();
    this.updateOperation.run({
      id: operationId,
      status: TRANSCRIPTION_OPERATION_STATUSES.FAILED,
      artifactPath: null,
      durationMs: null,
      completedAt,
    });

    return this.getOperation(operationId);
  }

  listOperations(workflowId: string): readonly TranscriptionOperationRecord[] {
    return this.selectOperationsByWorkflow.all(workflowId) as TranscriptionOperationRecord[];
  }

  private getOperation(operationId: string): TranscriptionOperationRecord {
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
        FROM transcription_operations
        WHERE id = ?
      `,
      )
      .get(operationId) as TranscriptionOperationRecord | undefined;

    if (row === undefined) {
      throw new Error(`Transcription operation "${operationId}" was not found.`);
    }

    return row;
  }
}
