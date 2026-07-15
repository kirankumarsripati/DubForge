import type { OutputConfiguration } from '@dubforge/job-config';

import type { Deliverable } from '../domain/deliverable.js';
import type { ExportProfile } from '../domain/export-profile.js';
import type { PackagingPlan } from '../domain/packaging-plan.js';
import type { ValidationReport } from '../domain/validation-report.js';

export interface ExportProfileLoaderPort {
  loadProfile(profileId: string): ExportProfile;
  listBuiltinProfileIds(): readonly string[];
}

export interface ExportDeliverableInput {
  readonly deliverable: Deliverable;
  readonly sourcePath: string;
  readonly outputDirectory: string;
  readonly output: OutputConfiguration;
  readonly languageCodes: readonly string[];
}

export interface ExportedDeliverableResult {
  readonly outputPath: string;
  readonly sizeBytes: number;
  readonly durationMs: number;
  readonly checksum: string;
  readonly languageTags: readonly string[];
  readonly trackCount: number;
}

export interface ExporterPort {
  exportDeliverable(input: ExportDeliverableInput): Promise<ExportedDeliverableResult>;
}

export interface ValidateDeliverableInput {
  readonly workflowId: string;
  readonly jobId: string;
  readonly deliverable: Deliverable;
  readonly filePath: string;
  readonly expectedDurationMs: number | null;
  readonly expectedLanguageTags: readonly string[];
}

export interface ValidatedDeliverableResult {
  readonly report: ValidationReport;
}

export interface ValidatorPort {
  validateDeliverable(input: ValidateDeliverableInput): Promise<ValidatedDeliverableResult>;
}

export interface ArchiveProjectBundleInput {
  readonly workflowId: string;
  readonly jobId: string;
  readonly outputDirectory: string;
  readonly timeline: Readonly<Record<string, unknown>>;
  readonly workflow: Readonly<Record<string, unknown>>;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly localization: Readonly<Record<string, unknown>>;
  readonly artifacts: Readonly<Record<string, string>>;
  readonly report: Readonly<Record<string, unknown>>;
  readonly diagnostics: Readonly<Record<string, unknown>>;
  readonly exportHistory: Readonly<Record<string, unknown>>;
}

export interface ArchiveBuilderPort {
  buildProjectBundle(input: ArchiveProjectBundleInput): Promise<string>;
}

export interface PackagingPlanPreview {
  readonly plan: PackagingPlan;
  readonly summary: string;
}
