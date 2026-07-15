export { DELIVERY_EVENTS } from './domain/events.js';

export {
  DELIVERY_VERSION,
  PROJECT_BUNDLE_VERSION,
  DELIVERY_OPERATION_KINDS,
  DELIVERY_OPERATION_STATUSES,
  DELIVERABLE_KINDS,
  DELIVERABLE_STATUSES,
  PACKAGING_PLAN_STATUSES,
  DEFAULT_EXPORT_PROFILE_ID,
  BUILTIN_EXPORT_PROFILE_IDS,
} from './domain/constants.js';

export type { ExportProfile, ExportProfileDeliverableSpec } from './domain/export-profile.js';
export {
  createExportProfile,
  serializeExportProfile,
  deserializeExportProfile,
} from './domain/export-profile.js';

export type { Deliverable } from './domain/deliverable.js';
export {
  createDeliverable,
  serializeDeliverable,
  deserializeDeliverable,
} from './domain/deliverable.js';

export type { PackagingPlan } from './domain/packaging-plan.js';
export {
  createPackagingPlan,
  serializePackagingPlan,
  deserializePackagingPlan,
} from './domain/packaging-plan.js';

export type { ValidationReport, ValidationCheck } from './domain/validation-report.js';
export {
  createValidationReport,
  serializeValidationReport,
  deserializeValidationReport,
} from './domain/validation-report.js';

export type { DeliveryAggregate } from './domain/delivery-aggregate.js';
export {
  createDeliveryAggregate,
  serializeDeliveryAggregate,
  deserializeDeliveryAggregate,
} from './domain/delivery-aggregate.js';

export type {
  ExportProfileLoaderPort,
  ExporterPort,
  ValidatorPort,
  ArchiveBuilderPort,
} from './ports/delivery-ports.js';

export {
  PackageBuilder,
  createPackageBuilder,
  resolveProfileIdForOutput,
} from './engine/package-builder.js';
export { Exporter, createExporter, applyExportResult } from './engine/exporter.js';
export { Validator, createValidator, assertDeliverableValid } from './engine/validator.js';
export { ReportGenerator, createReportGenerator } from './engine/report-generator.js';
export { ArchiveBuilder, createArchiveBuilder } from './engine/archive-builder.js';

export {
  JsonExportProfileLoader,
  SyncJsonExportProfileLoader,
} from './adapters/export-profile-loader.js';
export {
  FfmpegDeliveryAdapter,
  FfmpegValidatorAdapter,
  FixtureFfmpegDeliveryAdapter,
  FixtureFfmpegValidatorAdapter,
} from './adapters/ffmpeg-delivery-adapter.js';

export { DeliveryRepository } from './persistence/delivery-repository.js';

export { DeliveryApplication } from './application/delivery-application.js';
export {
  VerifyDeliverablesService,
  PackageAndDeliverService,
  createPackageAndDeliverService,
} from './application/delivery-services.js';

export { DeliveryDiagnostics } from './diagnostics/delivery-diagnostics.js';

export {
  DeliveryExecutionAdapter,
  DELIVERY_NODE_KINDS,
  isDeliveryNodeKind,
} from './integration/delivery-execution-adapter.js';
export {
  createPlatformAdapterRegistry,
  resolveGoldenFixturePath,
} from './integration/adapter-registry.js';

export {
  createDeliveryPlatform,
  type DeliveryPlatform,
  type DeliveryPlatformOptions,
} from './delivery-platform.js';
