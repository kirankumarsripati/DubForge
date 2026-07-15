import type { OutputConfiguration } from '@dubforge/job-config';

import { createDeliverable } from '../domain/deliverable.js';
import {
  DELIVERABLE_KINDS,
  DEFAULT_EXPORT_PROFILE_ID,
  PACKAGING_PLAN_STATUSES,
} from '../domain/constants.js';
import { createPackagingPlan } from '../domain/packaging-plan.js';
import type { ExportProfileLoaderPort } from '../ports/delivery-ports.js';

function resolveProfileId(output: OutputConfiguration): string {
  if (!output.generateTranslatedAudio && output.generateSubtitles) {
    return 'audio-only';
  }
  if (output.exportSrt && !output.embedSubtitles) {
    return 'studio-archive';
  }
  return DEFAULT_EXPORT_PROFILE_ID;
}

function buildDeliverableLabel(kind: string, container: string | null): string {
  if (container !== null) {
    return `${kind.toUpperCase()} (${container})`;
  }
  return kind;
}

export class PackageBuilder {
  constructor(private readonly profileLoader: ExportProfileLoaderPort) {}

  buildPlan(input: {
    readonly workflowId: string;
    readonly jobId: string;
    readonly outputDirectory: string;
    readonly output: OutputConfiguration;
    readonly artifacts: Readonly<Record<string, string>>;
    readonly languageCodes: readonly string[];
    readonly exportProfileId?: string;
  }) {
    const profileId = input.exportProfileId ?? resolveProfileId(input.output);
    const profile = this.profileLoader.loadProfile(profileId);
    const muxPath = input.artifacts.mux;

    const deliverables = profile.deliverables.flatMap((spec) => {
      const entries = [];

      if (spec.kind === DELIVERABLE_KINDS.MKV || spec.kind === DELIVERABLE_KINDS.MP4) {
        const extension = spec.container ?? spec.kind;
        entries.push(
          createDeliverable({
            kind: spec.kind,
            label: buildDeliverableLabel(spec.kind, spec.container),
            outputPath: `${input.outputDirectory}/output.${extension}`,
            sourceArtifactKey: muxPath !== undefined ? 'mux' : null,
          }),
        );
      }

      if (spec.kind === DELIVERABLE_KINDS.AUDIO_ONLY) {
        entries.push(
          createDeliverable({
            kind: DELIVERABLE_KINDS.AUDIO_ONLY,
            label: 'Audio Only',
            outputPath: `${input.outputDirectory}/audio-only.m4a`,
            sourceArtifactKey: 'mux',
          }),
        );
      }

      if (spec.kind === DELIVERABLE_KINDS.SUBTITLE_PACKAGE && spec.exportSrt) {
        entries.push(
          createDeliverable({
            kind: DELIVERABLE_KINDS.SUBTITLE_PACKAGE,
            label: 'Subtitle Package',
            outputPath: `${input.outputDirectory}/subtitles`,
            sourceArtifactKey: null,
          }),
        );
      }

      if (spec.includeProjectBundle) {
        entries.push(
          createDeliverable({
            kind: DELIVERABLE_KINDS.PROJECT_BUNDLE,
            label: 'Project Bundle',
            outputPath: `${input.outputDirectory}/project.dubforge`,
            sourceArtifactKey: null,
          }),
        );
      }

      if (spec.includeValidationReport) {
        entries.push(
          createDeliverable({
            kind: DELIVERABLE_KINDS.VALIDATION_REPORT,
            label: 'Validation Report',
            outputPath: `${input.outputDirectory}/validation-report.json`,
            sourceArtifactKey: null,
          }),
        );
      }

      return entries;
    });

    if (deliverables.length === 0) {
      throw new Error('Export profile produced an empty packaging plan.');
    }

    return createPackagingPlan({
      workflowId: input.workflowId,
      jobId: input.jobId,
      exportProfileId: profile.id,
      outputDirectory: input.outputDirectory,
      deliverables,
    });
  }

  validatePlan(
    plan: ReturnType<typeof createPackagingPlan>,
    artifacts: Readonly<Record<string, string>>,
  ): void {
    const requiresMux = plan.deliverables.some(
      (deliverable) =>
        deliverable.kind === DELIVERABLE_KINDS.MKV ||
        deliverable.kind === DELIVERABLE_KINDS.MP4 ||
        deliverable.kind === DELIVERABLE_KINDS.AUDIO_ONLY,
    );

    if (requiresMux && artifacts.mux === undefined) {
      throw new Error('Packaging plan requires a mux artifact before export.');
    }
  }

  createPreview(plan: ReturnType<typeof createPackagingPlan>): {
    readonly plan: ReturnType<typeof createPackagingPlan>;
    readonly summary: string;
  } {
    const summary = plan.deliverables
      .map((deliverable) => `${deliverable.label} → ${deliverable.outputPath}`)
      .join('\n');

    return {
      plan: { ...plan, status: PACKAGING_PLAN_STATUSES.PREVIEWED, previewArtifactPath: null },
      summary,
    };
  }
}

export function createPackageBuilder(profileLoader: ExportProfileLoaderPort): PackageBuilder {
  return new PackageBuilder(profileLoader);
}

export function resolveProfileIdForOutput(output: OutputConfiguration): string {
  return resolveProfileId(output);
}
