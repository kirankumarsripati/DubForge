import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import {
  deserializeAlignmentPlan,
  serializeAlignmentPlan,
  type AlignmentPlan,
} from '../domain/alignment-plan.js';
import {
  deserializeAudioComposition,
  serializeAudioComposition,
  type AudioComposition,
} from '../domain/audio-composition.js';
import { TEMPORAL_OPERATION_STATUSES } from '../domain/constants.js';
import type { TemporalOperationKind } from '../domain/constants.js';

export interface TemporalOperationRecord {
  readonly id: string;
  readonly kind: TemporalOperationKind;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly languageCode: string | null;
  readonly status: (typeof TEMPORAL_OPERATION_STATUSES)[keyof typeof TEMPORAL_OPERATION_STATUSES];
  readonly artifactPath: string | null;
  readonly durationMs: number | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

export class TemporalRepository {
  constructor(private readonly db: Database.Database) {}

  saveAlignmentPlan(plan: AlignmentPlan): void {
    this.db
      .prepare(
        `
        INSERT INTO alignment_plans (
          id, workflow_id, job_id, language_code, voice_performance_id, plan_json, created_at
        ) VALUES (
          @id, @workflowId, @jobId, @languageCode, @voicePerformanceId, @planJson, @createdAt
        )
        ON CONFLICT(workflow_id, language_code) DO UPDATE SET
          id = excluded.id,
          job_id = excluded.job_id,
          voice_performance_id = excluded.voice_performance_id,
          plan_json = excluded.plan_json,
          created_at = excluded.created_at
      `,
      )
      .run({
        id: plan.id,
        workflowId: plan.workflowId,
        jobId: plan.jobId,
        languageCode: plan.languageCode,
        voicePerformanceId: plan.voicePerformanceId,
        planJson: serializeAlignmentPlan(plan),
        createdAt: plan.createdAt,
      });
  }

  getAlignmentPlan(workflowId: string, languageCode: string): AlignmentPlan | null {
    const row = this.db
      .prepare(
        `
        SELECT plan_json AS planJson
        FROM alignment_plans
        WHERE workflow_id = ? AND language_code = ?
      `,
      )
      .get(workflowId, languageCode) as { planJson: string } | undefined;

    if (row === undefined) {
      return null;
    }

    return deserializeAlignmentPlan(row.planJson);
  }

  saveAudioComposition(composition: AudioComposition): void {
    this.db
      .prepare(
        `
        INSERT INTO audio_compositions (
          id, workflow_id, job_id, language_code, alignment_plan_id,
          composition_json, aligned_speech_path, composed_audio_path, created_at
        ) VALUES (
          @id, @workflowId, @jobId, @languageCode, @alignmentPlanId,
          @compositionJson, @alignedSpeechPath, @composedAudioPath, @createdAt
        )
        ON CONFLICT(workflow_id, language_code) DO UPDATE SET
          id = excluded.id,
          job_id = excluded.job_id,
          alignment_plan_id = excluded.alignment_plan_id,
          composition_json = excluded.composition_json,
          aligned_speech_path = excluded.aligned_speech_path,
          composed_audio_path = excluded.composed_audio_path,
          created_at = excluded.created_at
      `,
      )
      .run({
        id: composition.id,
        workflowId: composition.workflowId,
        jobId: composition.jobId,
        languageCode: composition.languageCode,
        alignmentPlanId: composition.alignmentPlanId,
        compositionJson: serializeAudioComposition(composition),
        alignedSpeechPath: composition.alignedSpeechPath,
        composedAudioPath: composition.composedAudioPath,
        createdAt: composition.createdAt,
      });
  }

  getAudioComposition(workflowId: string, languageCode: string): AudioComposition | null {
    const row = this.db
      .prepare(
        `
        SELECT composition_json AS compositionJson
        FROM audio_compositions
        WHERE workflow_id = ? AND language_code = ?
      `,
      )
      .get(workflowId, languageCode) as { compositionJson: string } | undefined;

    if (row === undefined) {
      return null;
    }

    return deserializeAudioComposition(row.compositionJson);
  }

  startOperation(input: {
    readonly kind: TemporalOperationKind;
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly languageCode: string | null;
  }): TemporalOperationRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `
        INSERT INTO temporal_operations (
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
        status: TEMPORAL_OPERATION_STATUSES.RUNNING,
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
      status: TEMPORAL_OPERATION_STATUSES.RUNNING,
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
  ): TemporalOperationRecord {
    const completedAt = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE temporal_operations
        SET status = @status,
            artifact_path = @artifactPath,
            duration_ms = @durationMs,
            completed_at = @completedAt
        WHERE id = @id
      `,
      )
      .run({
        id: operationId,
        status: TEMPORAL_OPERATION_STATUSES.COMPLETED,
        artifactPath,
        durationMs,
        completedAt,
      });

    return this.getOperation(operationId);
  }

  failOperation(operationId: string): TemporalOperationRecord {
    const completedAt = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE temporal_operations
        SET status = @status,
            artifact_path = @artifactPath,
            duration_ms = @durationMs,
            completed_at = @completedAt
        WHERE id = @id
      `,
      )
      .run({
        id: operationId,
        status: TEMPORAL_OPERATION_STATUSES.FAILED,
        artifactPath: null,
        durationMs: null,
        completedAt,
      });

    return this.getOperation(operationId);
  }

  listOperations(workflowId: string): readonly TemporalOperationRecord[] {
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
        FROM temporal_operations
        WHERE workflow_id = ?
        ORDER BY created_at ASC
      `,
      )
      .all(workflowId) as TemporalOperationRecord[];
  }

  private getOperation(operationId: string): TemporalOperationRecord {
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
        FROM temporal_operations
        WHERE id = ?
      `,
      )
      .get(operationId) as TemporalOperationRecord | undefined;

    if (row === undefined) {
      throw new Error(`Temporal operation "${operationId}" was not found.`);
    }

    return row;
  }
}
