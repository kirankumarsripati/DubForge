import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import type { OutputConfiguration } from '@dubforge/job-config';

import {
  DELIVERY_OPERATION_KINDS,
  DELIVERABLE_KINDS,
  DELIVERABLE_STATUSES,
} from '../domain/constants.js';
import type { Deliverable } from '../domain/deliverable.js';
import { createDeliveryAggregate } from '../domain/delivery-aggregate.js';
import { serializePackagingPlan } from '../domain/packaging-plan.js';
import { serializeValidationReport } from '../domain/validation-report.js';
import { createArchiveBuilder } from '../engine/archive-builder.js';
import { applyExportResult } from '../engine/exporter.js';
import { createPackageBuilder } from '../engine/package-builder.js';
import { createReportGenerator } from '../engine/report-generator.js';
import { assertDeliverableValid } from '../engine/validator.js';
import type {
  ArchiveBuilderPort,
  ExporterPort,
  ExportProfileLoaderPort,
  ValidatorPort,
} from '../ports/delivery-ports.js';
import type { DeliveryRepository } from '../persistence/delivery-repository.js';
import {
  publishDeliveryMetrics,
  publishDeliveryOperationCompleted,
  publishDeliveryOperationFailed,
  publishDeliveryOperationStarted,
  publishPackagingCompleted,
  publishPackagingStarted,
  publishProjectArchived,
  publishValidationCompleted,
} from './delivery-event-publisher.js';

function extractLanguageCodes(artifacts: Readonly<Record<string, string>>): string[] {
  const languages = new Set<string>();
  for (const key of Object.keys(artifacts)) {
    const match = /:(?<lang>[a-z]{2})$/u.exec(key);
    if (match?.groups?.lang !== undefined) {
      languages.add(match.groups.lang);
    }
  }
  return [...languages];
}

export class VerifyDeliverablesService {
  constructor(
    private readonly options: {
      readonly eventBus: DomainEventBus;
      readonly repository: DeliveryRepository;
      readonly validator: ValidatorPort;
      readonly artifactSink?: ArtifactSink;
    },
  ) {}

  async verifyForWorkflow(input: {
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly artifactRoot: string;
    readonly artifacts: Readonly<Record<string, string>>;
    readonly artifactSink?: ArtifactSink;
    readonly onProgress: (progress: number) => void;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const muxPath = input.artifacts.mux;
    if (muxPath === undefined) {
      throw new Error('Verify stage requires a mux artifact.');
    }

    const operation = this.options.repository.startOperation({
      kind: DELIVERY_OPERATION_KINDS.VERIFY,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
    });

    publishDeliveryOperationStarted({
      eventBus: this.options.eventBus,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      operation,
    });

    try {
      input.onProgress(20);

      const languageCodes = extractLanguageCodes(input.artifacts);
      const muxDeliverable: Deliverable = {
        id: 'mux-deliverable',
        kind: DELIVERABLE_KINDS.MKV,
        label: 'Mux Output',
        outputPath: muxPath,
        sourceArtifactKey: 'mux',
        status: DELIVERABLE_STATUSES.PLANNED,
        checksum: null,
        sizeBytes: null,
        durationMs: 5000,
        languageTags: ['en', ...languageCodes],
        trackCount: 1 + languageCodes.length,
        createdAt: new Date().toISOString(),
      };

      this.options.repository.saveDeliverable({
        packagingPlanId: `verify:${input.workflowId}`,
        workflowId: input.workflowId,
        jobId: input.jobId,
        deliverable: muxDeliverable,
      });

      const validation = await this.options.validator.validateDeliverable({
        workflowId: input.workflowId,
        jobId: input.jobId,
        deliverable: muxDeliverable,
        filePath: muxPath,
        expectedDurationMs: 5000,
        expectedLanguageTags: ['en', ...languageCodes],
      });

      assertDeliverableValid(validation);
      this.options.repository.saveValidationReport(validation.report);

      const reportPath = `${input.artifactRoot}/${input.nodeId}-verify-report.json`;
      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(reportPath, serializeValidationReport(validation.report));
      }

      publishValidationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        report: validation.report,
      });

      input.onProgress(100);

      const completed = this.options.repository.completeOperation(operation.id, reportPath, 1);

      publishDeliveryOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath: reportPath,
      });

      return {
        artifacts: {
          'verify-report': reportPath,
          [`validation:${validation.report.deliverableId}`]: reportPath,
        },
        durationMs: 1,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Verification failed.';
      publishDeliveryOperationFailed({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: failed,
        message,
      });
      throw error;
    }
  }
}

export class PackageAndDeliverService {
  constructor(
    private readonly options: {
      readonly eventBus: DomainEventBus;
      readonly repository: DeliveryRepository;
      readonly profileLoader: ExportProfileLoaderPort;
      readonly exporter: ExporterPort;
      readonly validator: ValidatorPort;
      readonly archiveBuilder: ArchiveBuilderPort;
      readonly artifactSink?: ArtifactSink;
    },
  ) {}

  async packageForWorkflow(input: {
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly artifactRoot: string;
    readonly artifacts: Readonly<Record<string, string>>;
    readonly output: OutputConfiguration;
    readonly outputDirectory: string;
    readonly artifactSink?: ArtifactSink;
    readonly onProgress: (progress: number) => void;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const startedAt = Date.now();
    const operation = this.options.repository.startOperation({
      kind: DELIVERY_OPERATION_KINDS.PACKAGE,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
    });

    publishDeliveryOperationStarted({
      eventBus: this.options.eventBus,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      operation,
    });

    try {
      const languageCodes = extractLanguageCodes(input.artifacts);
      const packageBuilder = createPackageBuilder(this.options.profileLoader);

      const draftPlan = packageBuilder.buildPlan({
        workflowId: input.workflowId,
        jobId: input.jobId,
        outputDirectory: input.outputDirectory,
        output: input.output,
        artifacts: input.artifacts,
        languageCodes,
      });

      packageBuilder.validatePlan(draftPlan, input.artifacts);
      const preview = packageBuilder.createPreview(draftPlan);
      const planPath = `${input.artifactRoot}/${input.nodeId}-packaging-plan.json`;

      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(planPath, serializePackagingPlan(preview.plan));
      }

      this.options.repository.savePackagingPlan(preview.plan);

      publishPackagingStarted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        plan: preview.plan,
      });

      input.onProgress(15);

      const muxPath = input.artifacts.mux ?? '';
      const exportedDeliverables = await Promise.all(
        preview.plan.deliverables.map(async (deliverable, index) => {
          if (deliverable.kind === DELIVERABLE_KINDS.PROJECT_BUNDLE) {
            const bundlePath = await this.options.archiveBuilder.buildProjectBundle({
              workflowId: input.workflowId,
              jobId: input.jobId,
              outputDirectory: deliverable.outputPath,
              timeline: { workflowId: input.workflowId, nodes: Object.keys(input.artifacts) },
              workflow: { workflowId: input.workflowId, jobId: input.jobId },
              settings: { output: input.output },
              localization: { languages: languageCodes },
              artifacts: input.artifacts,
              report: { planId: preview.plan.id },
              diagnostics: { warnings: [] },
              exportHistory: { operationId: operation.id },
            });

            publishProjectArchived({
              eventBus: this.options.eventBus,
              workflowId: input.workflowId,
              jobId: input.jobId,
              nodeId: input.nodeId,
              bundlePath,
            });

            input.onProgress(
              15 + Math.round(((index + 1) / preview.plan.deliverables.length) * 50),
            );
            return {
              ...deliverable,
              outputPath: bundlePath,
              status: DELIVERABLE_STATUSES.EXPORTING,
            };
          }

          if (deliverable.kind === DELIVERABLE_KINDS.VALIDATION_REPORT) {
            return deliverable;
          }

          const sourcePath =
            deliverable.sourceArtifactKey !== null
              ? (input.artifacts[deliverable.sourceArtifactKey] ?? muxPath)
              : muxPath;

          const exported = await this.options.exporter.exportDeliverable({
            deliverable,
            sourcePath,
            outputDirectory: input.outputDirectory,
            output: input.output,
            languageCodes,
          });

          input.onProgress(15 + Math.round(((index + 1) / preview.plan.deliverables.length) * 50));
          return applyExportResult(deliverable, exported);
        }),
      );

      input.onProgress(70);

      const validationReports = await Promise.all(
        exportedDeliverables.map(async (deliverable) => {
          if (deliverable.kind === DELIVERABLE_KINDS.VALIDATION_REPORT) {
            return null;
          }

          const validation = await this.options.validator.validateDeliverable({
            workflowId: input.workflowId,
            jobId: input.jobId,
            deliverable,
            filePath: deliverable.outputPath,
            expectedDurationMs: deliverable.durationMs,
            expectedLanguageTags: deliverable.languageTags,
          });

          assertDeliverableValid(validation);
          this.options.repository.saveValidationReport(validation.report);

          publishValidationCompleted({
            eventBus: this.options.eventBus,
            workflowId: input.workflowId,
            jobId: input.jobId,
            nodeId: input.nodeId,
            report: validation.report,
          });

          return validation.report;
        }),
      );

      const reports = validationReports.filter(
        (report): report is NonNullable<typeof report> => report !== null,
      );
      const exportSizeBytes = exportedDeliverables.reduce(
        (total, deliverable) => total + (deliverable.sizeBytes ?? 0),
        0,
      );
      const exportTimeMs = Date.now() - startedAt;
      const validationScore =
        reports.length === 0
          ? 100
          : Math.round(reports.reduce((sum, report) => sum + report.score, 0) / reports.length);
      const warningCount = reports.reduce((total, report) => total + report.warnings.length, 0);

      const completedDeliverables = exportedDeliverables.map((deliverable) => ({
        ...deliverable,
        status: DELIVERABLE_STATUSES.COMPLETED,
      }));

      const aggregate = createDeliveryAggregate({
        workflowId: input.workflowId,
        jobId: input.jobId,
        plan: preview.plan,
        deliverables: completedDeliverables,
        validationReports: reports,
        projectBundlePath:
          completedDeliverables.find((d) => d.kind === DELIVERABLE_KINDS.PROJECT_BUNDLE)
            ?.outputPath ?? null,
        exportTimeMs,
        exportSizeBytes,
        validationScore,
        warningCount,
      });

      this.options.repository.saveDeliveryAggregate(aggregate);

      const deliveryPath = `${input.artifactRoot}/${input.nodeId}-delivery.json`;
      if (sink !== undefined) {
        await sink.writeText(deliveryPath, JSON.stringify(aggregate, null, 2));
      }

      const metrics = createReportGenerator().computeMetrics({ aggregate, exportTimeMs });
      publishDeliveryMetrics({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        metrics,
      });

      publishPackagingCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        aggregate,
      });

      input.onProgress(100);

      const completed = this.options.repository.completeOperation(
        operation.id,
        deliveryPath,
        exportTimeMs,
      );

      publishDeliveryOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath: deliveryPath,
      });

      const artifactEntries = Object.fromEntries(
        completedDeliverables.flatMap((deliverable) => [
          [`deliverable:${deliverable.kind}`, deliverable.outputPath],
          [`deliverable:${deliverable.id}`, deliverable.outputPath],
        ]),
      );

      return {
        artifacts: {
          'packaging-plan': planPath,
          'delivery-aggregate': deliveryPath,
          manifest: deliveryPath,
          ...artifactEntries,
        },
        durationMs: exportTimeMs,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Packaging failed.';
      publishDeliveryOperationFailed({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: failed,
        message,
      });
      throw error;
    }
  }
}

export function createPackageAndDeliverService(input: {
  readonly eventBus: DomainEventBus;
  readonly repository: DeliveryRepository;
  readonly profileLoader: ExportProfileLoaderPort;
  readonly exporter: ExporterPort;
  readonly validator: ValidatorPort;
  readonly archiveBuilder?: ArchiveBuilderPort;
  readonly artifactSink?: ArtifactSink;
}): PackageAndDeliverService {
  return new PackageAndDeliverService({
    ...input,
    archiveBuilder: input.archiveBuilder ?? createArchiveBuilder(),
  });
}
