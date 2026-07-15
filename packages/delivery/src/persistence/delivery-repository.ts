import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import { DELIVERY_OPERATION_STATUSES } from '../domain/constants.js';
import type { DeliveryOperationKind } from '../domain/constants.js';
import {
  deserializeDeliveryAggregate,
  type DeliveryAggregate,
} from '../domain/delivery-aggregate.js';
import {
  serializeDeliverable,
  deserializeDeliverable,
  type Deliverable,
} from '../domain/deliverable.js';
import type { PackagingPlan } from '../domain/packaging-plan.js';
import {
  deserializeValidationReport,
  serializeValidationReport,
  type ValidationReport,
} from '../domain/validation-report.js';

export interface DeliveryOperationRecord {
  readonly id: string;
  readonly kind: DeliveryOperationKind;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly status: (typeof DELIVERY_OPERATION_STATUSES)[keyof typeof DELIVERY_OPERATION_STATUSES];
  readonly artifactPath: string | null;
  readonly durationMs: number | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

export class DeliveryRepository {
  constructor(private readonly db: Database.Database) {}

  savePackagingPlan(plan: PackagingPlan): void {
    for (const deliverable of plan.deliverables) {
      this.saveDeliverable({
        packagingPlanId: plan.id,
        workflowId: plan.workflowId,
        jobId: plan.jobId,
        deliverable,
      });
    }
  }

  saveDeliverable(input: {
    readonly packagingPlanId: string;
    readonly workflowId: string;
    readonly jobId: string;
    readonly deliverable: Deliverable;
  }): void {
    const { deliverable, packagingPlanId, workflowId, jobId } = input;
    this.db
      .prepare(
        `
        INSERT INTO deliverables (
          id, workflow_id, job_id, packaging_plan_id, kind, output_path, status,
          checksum, size_bytes, duration_ms, deliverable_json, created_at
        ) VALUES (
          @id, @workflowId, @jobId, @packagingPlanId, @kind, @outputPath, @status,
          @checksum, @sizeBytes, @durationMs, @deliverableJson, @createdAt
        )
        ON CONFLICT(id) DO UPDATE SET
          output_path = excluded.output_path,
          status = excluded.status,
          checksum = excluded.checksum,
          size_bytes = excluded.size_bytes,
          duration_ms = excluded.duration_ms,
          deliverable_json = excluded.deliverable_json
      `,
      )
      .run({
        id: deliverable.id,
        workflowId,
        jobId,
        packagingPlanId,
        kind: deliverable.kind,
        outputPath: deliverable.outputPath,
        status: deliverable.status,
        checksum: deliverable.checksum,
        sizeBytes: deliverable.sizeBytes,
        durationMs: deliverable.durationMs,
        deliverableJson: serializeDeliverable(deliverable),
        createdAt: deliverable.createdAt,
      });
  }

  saveValidationReport(report: ValidationReport): void {
    this.db
      .prepare(
        `
        INSERT INTO validation_reports (
          id, workflow_id, job_id, deliverable_id, score, playable, report_json, created_at
        ) VALUES (
          @id, @workflowId, @jobId, @deliverableId, @score, @playable, @reportJson, @createdAt
        )
        ON CONFLICT(id) DO UPDATE SET
          score = excluded.score,
          playable = excluded.playable,
          report_json = excluded.report_json
      `,
      )
      .run({
        id: report.id,
        workflowId: report.workflowId,
        jobId: report.jobId,
        deliverableId: report.deliverableId,
        score: report.score,
        playable: report.playable ? 1 : 0,
        reportJson: serializeValidationReport(report),
        createdAt: report.createdAt,
      });
  }

  saveDeliveryAggregate(aggregate: DeliveryAggregate): void {
    for (const deliverable of aggregate.deliverables) {
      this.db
        .prepare(
          `
          INSERT INTO deliverables (
            id, workflow_id, job_id, packaging_plan_id, kind, output_path, status,
            checksum, size_bytes, duration_ms, deliverable_json, created_at
          ) VALUES (
            @id, @workflowId, @jobId, @packagingPlanId, @kind, @outputPath, @status,
            @checksum, @sizeBytes, @durationMs, @deliverableJson, @createdAt
          )
          ON CONFLICT(id) DO UPDATE SET
            output_path = excluded.output_path,
            status = excluded.status,
            checksum = excluded.checksum,
            size_bytes = excluded.size_bytes,
            duration_ms = excluded.duration_ms,
            deliverable_json = excluded.deliverable_json
        `,
        )
        .run({
          id: deliverable.id,
          workflowId: aggregate.workflowId,
          jobId: aggregate.jobId,
          packagingPlanId: aggregate.packagingPlanId,
          kind: deliverable.kind,
          outputPath: deliverable.outputPath,
          status: deliverable.status,
          checksum: deliverable.checksum,
          sizeBytes: deliverable.sizeBytes,
          durationMs: deliverable.durationMs,
          deliverableJson: serializeDeliverable(deliverable),
          createdAt: deliverable.createdAt,
        });
    }

    for (const report of aggregate.validationReports) {
      this.saveValidationReport(report);
    }

    this.db
      .prepare(
        `
        INSERT INTO export_history (
          id, workflow_id, job_id, operation_id, export_profile_id, status,
          export_time_ms, export_size_bytes, validation_score, warning_count,
          created_at, completed_at
        ) VALUES (
          @id, @workflowId, @jobId, @operationId, @exportProfileId, @status,
          @exportTimeMs, @exportSizeBytes, @validationScore, @warningCount,
          @createdAt, @completedAt
        )
      `,
      )
      .run({
        id: randomUUID(),
        workflowId: aggregate.workflowId,
        jobId: aggregate.jobId,
        operationId: aggregate.id,
        exportProfileId: aggregate.exportProfileId,
        status: DELIVERY_OPERATION_STATUSES.COMPLETED,
        exportTimeMs: aggregate.exportTimeMs,
        exportSizeBytes: aggregate.exportSizeBytes,
        validationScore: aggregate.validationScore,
        warningCount: aggregate.warningCount,
        createdAt: aggregate.createdAt,
        completedAt: aggregate.createdAt,
      });
  }

  getDeliveryAggregate(workflowId: string): DeliveryAggregate | null {
    const row = this.db
      .prepare(
        `
        SELECT report_json AS reportJson
        FROM validation_reports
        WHERE workflow_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
      )
      .get(workflowId) as { reportJson: string } | undefined;

    if (row === undefined) {
      return null;
    }

    void row;
    const deliverables = this.listDeliverables(workflowId);
    if (deliverables.length === 0) {
      return null;
    }

    const reports = this.listValidationReports(workflowId);
    const history = this.listExportHistory(workflowId)[0];

    return deserializeDeliveryAggregate(
      JSON.stringify({
        version: '1.0.0',
        id: history?.operationId ?? randomUUID(),
        workflowId,
        jobId: deliverables[0]?.id ?? workflowId,
        packagingPlanId: deliverables[0]?.id ?? workflowId,
        exportProfileId: history?.exportProfileId ?? 'local-playback',
        deliverables,
        validationReports: reports,
        projectBundlePath:
          deliverables.find((d) => d.kind === 'project-bundle')?.outputPath ?? null,
        exportTimeMs: history?.exportTimeMs ?? 0,
        exportSizeBytes: history?.exportSizeBytes ?? 0,
        validationScore: history?.validationScore ?? 0,
        warningCount: history?.warningCount ?? 0,
        createdAt: history?.createdAt ?? new Date().toISOString(),
      }),
    );
  }

  listDeliverables(workflowId: string): readonly Deliverable[] {
    return this.db
      .prepare(
        `
        SELECT deliverable_json AS deliverableJson
        FROM deliverables
        WHERE workflow_id = ?
        ORDER BY created_at ASC
      `,
      )
      .all(workflowId)
      .map((row) => deserializeDeliverable((row as { deliverableJson: string }).deliverableJson));
  }

  listValidationReports(workflowId: string): readonly ValidationReport[] {
    return this.db
      .prepare(
        `
        SELECT report_json AS reportJson
        FROM validation_reports
        WHERE workflow_id = ?
        ORDER BY created_at ASC
      `,
      )
      .all(workflowId)
      .map((row) => deserializeValidationReport((row as { reportJson: string }).reportJson));
  }

  listExportHistory(workflowId: string): readonly {
    readonly operationId: string;
    readonly exportProfileId: string;
    readonly exportTimeMs: number | null;
    readonly exportSizeBytes: number | null;
    readonly validationScore: number | null;
    readonly warningCount: number | null;
    readonly createdAt: string;
  }[] {
    return this.db
      .prepare(
        `
        SELECT
          operation_id AS operationId,
          export_profile_id AS exportProfileId,
          export_time_ms AS exportTimeMs,
          export_size_bytes AS exportSizeBytes,
          validation_score AS validationScore,
          warning_count AS warningCount,
          created_at AS createdAt
        FROM export_history
        WHERE workflow_id = ?
        ORDER BY created_at ASC
      `,
      )
      .all(workflowId) as {
      operationId: string;
      exportProfileId: string;
      exportTimeMs: number | null;
      exportSizeBytes: number | null;
      validationScore: number | null;
      warningCount: number | null;
      createdAt: string;
    }[];
  }

  startOperation(input: {
    readonly kind: DeliveryOperationKind;
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
  }): DeliveryOperationRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    this.db
      .prepare(
        `
        INSERT INTO delivery_operations (
          id, kind, workflow_id, job_id, node_id, status,
          artifact_path, duration_ms, created_at, completed_at
        ) VALUES (
          @id, @kind, @workflowId, @jobId, @nodeId, @status,
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
        status: DELIVERY_OPERATION_STATUSES.RUNNING,
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
      status: DELIVERY_OPERATION_STATUSES.RUNNING,
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
  ): DeliveryOperationRecord {
    const completedAt = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE delivery_operations
        SET status = @status,
            artifact_path = @artifactPath,
            duration_ms = @durationMs,
            completed_at = @completedAt
        WHERE id = @id
      `,
      )
      .run({
        id: operationId,
        status: DELIVERY_OPERATION_STATUSES.COMPLETED,
        artifactPath,
        durationMs,
        completedAt,
      });

    return this.getOperation(operationId);
  }

  failOperation(operationId: string): DeliveryOperationRecord {
    const completedAt = new Date().toISOString();
    this.db
      .prepare(
        `
        UPDATE delivery_operations
        SET status = @status,
            completed_at = @completedAt
        WHERE id = @id
      `,
      )
      .run({
        id: operationId,
        status: DELIVERY_OPERATION_STATUSES.FAILED,
        completedAt,
      });

    return this.getOperation(operationId);
  }

  listOperations(workflowId: string): readonly DeliveryOperationRecord[] {
    return this.db
      .prepare(
        `
        SELECT
          id,
          kind,
          workflow_id AS workflowId,
          job_id AS jobId,
          node_id AS nodeId,
          status,
          artifact_path AS artifactPath,
          duration_ms AS durationMs,
          created_at AS createdAt,
          completed_at AS completedAt
        FROM delivery_operations
        WHERE workflow_id = ?
        ORDER BY created_at ASC
      `,
      )
      .all(workflowId) as DeliveryOperationRecord[];
  }

  private getOperation(operationId: string): DeliveryOperationRecord {
    const row = this.db
      .prepare(
        `
        SELECT
          id,
          kind,
          workflow_id AS workflowId,
          job_id AS jobId,
          node_id AS nodeId,
          status,
          artifact_path AS artifactPath,
          duration_ms AS durationMs,
          created_at AS createdAt,
          completed_at AS completedAt
        FROM delivery_operations
        WHERE id = ?
      `,
      )
      .get(operationId) as DeliveryOperationRecord | undefined;

    if (row === undefined) {
      throw new Error(`Delivery operation "${operationId}" was not found.`);
    }

    return row;
  }
}
