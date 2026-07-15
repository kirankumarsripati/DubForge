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

export { ALL_MIGRATIONS, MIGRATION_001_INITIAL } from './migrations/migrations.js';
export type { Migration } from './migrations/migrations.js';
export { MigrationRunner, runMigrations } from './migrations/runner.js';

export { AssetRepository } from './repository/asset-repository.js';

export { DownloadManager, SimulatedDownloadContentProvider } from './download/download-manager.js';
export type {
  DownloadContentProvider,
  DownloadManagerOptions,
} from './download/download-manager.js';

export { AssetVerifier } from './verification/verifier.js';
export type { VerificationResult } from './verification/verifier.js';

export { AssetResolver } from './resolver/asset-resolver.js';
export type { ResolveByIdOptions, ResolveByKindOptions } from './resolver/asset-resolver.js';

export { DependencyTracker } from './dependencies/dependency-tracker.js';
export type { DependencyResolution } from './dependencies/dependency-tracker.js';

export { AssetHealthService } from './health/asset-health.js';

export { VersionManager } from './version/version-manager.js';
export type { VersionRange } from './version/version-manager.js';
export { compare, parseVersion, satisfies } from './version/semver.js';

export { DEFAULT_ASSET_CATALOG, DEFAULT_ASSET_DEPENDENCIES } from './catalog/default-catalog.js';

export { AssetService, createAssetService } from './service/asset-service.js';
export type { AssetServiceOptions } from './service/asset-service.js';
