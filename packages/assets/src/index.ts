export { ASSETS_VERSION, BINARIES_DIRECTORY, DATABASE_FILENAME } from './constants.js';

export {
  ASSET_CATEGORIES,
  ASSET_KINDS,
  ASSET_STATUSES,
  DOWNLOAD_STATUSES,
  HEALTH_STATUSES,
} from './types.js';

export type {
  AssetCategory,
  AssetDependencyRecord,
  AssetHealthIssue,
  AssetHealthReport,
  AssetKind,
  AssetRecord,
  AssetStatus,
  AssetVersionRecord,
  CreateAssetInput,
  DownloadRecord,
  DownloadStatus,
  HealthStatus,
  MigrationRecord,
  ResolvedAsset,
  UpdateAssetMetadataInput,
} from './types.js';

export { AssetDatabase, createAssetDatabase } from './database/connection.js';
export type { AssetDatabaseOptions } from './database/connection.js';

export {
  ALL_MIGRATIONS,
  MIGRATION_001_INITIAL,
  MIGRATION_003_ASSET_DIAGNOSTICS,
} from './migrations/migrations.js';
export type { Migration } from './migrations/migrations.js';
export { MigrationRunner, runMigrations } from './migrations/runner.js';

export { AssetRepository } from './repository/asset-repository.js';

export { DownloadManager } from './download/download-manager.js';
export type { DownloadManagerOptions } from './download/download-manager.js';
export {
  createDefaultDownloadProviderRegistry,
  DownloadProviderRegistry,
} from './download/download-provider-registry.js';
export { DOWNLOAD_SOURCE_TYPES } from './download/source-types.js';
export type { DownloadSourceType } from './download/source-types.js';
export type {
  AssetDownloadManifest,
  DownloadExecutionContext,
  DownloadProgressUpdate,
  DownloadProvider,
  DownloadSource,
  HttpDownloadOptions,
} from './download/types.js';
export { GitHubReleaseDownloadProvider } from './download/providers/github-release-download-provider.js';
export { HuggingFaceDownloadProvider } from './download/providers/huggingface-download-provider.js';
export { LocalFileDownloadProvider } from './download/providers/local-file-download-provider.js';
export { MirrorDownloadProvider } from './download/providers/mirror-download-provider.js';

export { AssetVerifier } from './verification/verifier.js';
export type { VerificationResult } from './verification/verifier.js';
export { DetailedAssetVerifier } from './verification/detailed-verifier.js';
export type { DetailedVerificationResult } from './verification/detailed-verifier.js';

export { DiagnosticsRepository } from './diagnostics/diagnostics-repository.js';
export { VERIFICATION_CHECK_CODES } from './diagnostics/constants.js';
export type {
  AssetDiagnostics,
  CreateDownloadReportInput,
  DownloadReport,
  VerificationCheckStep,
  VerificationReport,
} from './diagnostics/types.js';
export { formatDownloadReportError } from './diagnostics/format-errors.js';

export { AssetResolver } from './resolver/asset-resolver.js';
export type { ResolveByIdOptions, ResolveByKindOptions } from './resolver/asset-resolver.js';

export { DependencyTracker } from './dependencies/dependency-tracker.js';

export { AssetManifestRegistry, toRegisteredAsset } from './registry/asset-manifest-registry.js';
export type { RegisteredAsset, AssetRegistrySnapshot } from './registry/asset-manifest-registry.js';
export { RegistryLoader } from './registry/registry-loader.js';
export type { RegistryLoaderOptions } from './registry/registry-loader.js';
export {
  REGISTRY_INDEX_FILENAME,
  registeredAssetManifestSchema,
  registryIndexSchema,
} from './registry/registry-schema.js';
export type {
  RegisteredAssetManifest,
  RegistryDependency,
  RegistryIndex,
} from './registry/registry-schema.js';

export { AssetHealthService } from './health/asset-health.js';

export { VersionManager } from './version/version-manager.js';
export type { VersionRange } from './version/version-manager.js';
export { compare, parseVersion, satisfies } from './version/semver.js';

export { AssetService, createAssetService } from './service/asset-service.js';
export type { AssetServiceOptions, DependencyResolution } from './service/asset-service.js';

export {
  createAssetPlatform,
  enqueueBackgroundDownload,
  type AssetPlatform,
  type AssetPlatformOptions,
} from './asset-platform.js';

export {
  discoverAssetCatalogs,
  buildCatalogMetadataMap,
  toCreateAssetInput,
  type DiscoveredCatalog,
  type CatalogMetadata,
} from './discovery/catalog-discovery.js';

export {
  toModelView,
  type ModelView,
  type ModelStatus,
  type ModelCategory,
  type ModelHealthStatus,
} from './presentation/model-view.js';
