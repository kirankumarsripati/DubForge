export const ASSET_STATUSES = {
  MISSING: 'missing',
  DOWNLOADING: 'downloading',
  VERIFYING: 'verifying',
  READY: 'ready',
  CORRUPTED: 'corrupted',
  OUTDATED: 'outdated',
} as const;

export type AssetStatus = (typeof ASSET_STATUSES)[keyof typeof ASSET_STATUSES];

export const ASSET_KINDS = {
  MODEL: 'model',
  EXTENSION: 'extension',
  RUNTIME: 'runtime',
} as const;

export type AssetKind = (typeof ASSET_KINDS)[keyof typeof ASSET_KINDS];

export const ASSET_CATEGORIES = {
  SPEECH_TO_TEXT: 'speech-to-text',
  TRANSLATION: 'translation',
  SPEECH: 'speech',
  EXTENSION_BINARY: 'extension-binary',
} as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[keyof typeof ASSET_CATEGORIES];

export const DOWNLOAD_STATUSES = {
  QUEUED: 'queued',
  DOWNLOADING: 'downloading',
  VERIFYING: 'verifying',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type DownloadStatus = (typeof DOWNLOAD_STATUSES)[keyof typeof DOWNLOAD_STATUSES];

export const HEALTH_STATUSES = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
} as const;

export type HealthStatus = (typeof HEALTH_STATUSES)[keyof typeof HEALTH_STATUSES];

export interface AssetRecord {
  readonly id: string;
  readonly name: string;
  readonly kind: AssetKind;
  readonly category: AssetCategory;
  readonly version: string;
  readonly filePath: string | null;
  readonly checksum: string | null;
  readonly sizeBytes: number | null;
  readonly status: AssetStatus;
  readonly sourceUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AssetVersionRecord {
  readonly id: string;
  readonly assetId: string;
  readonly version: string;
  readonly filePath: string | null;
  readonly checksum: string | null;
  readonly sizeBytes: number | null;
  readonly releasedAt: string;
  readonly isActive: boolean;
}

export interface AssetDependencyRecord {
  readonly id: string;
  readonly assetId: string;
  readonly dependsOnAssetId: string;
  readonly optional: boolean;
}

export interface DownloadRecord {
  readonly id: string;
  readonly assetId: string;
  readonly targetVersion: string;
  readonly targetPath: string;
  readonly tempPath: string;
  readonly bytesDownloaded: number;
  readonly totalBytes: number | null;
  readonly status: DownloadStatus;
  readonly errorMessage: string | null;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
}

export interface CreateAssetInput {
  readonly id: string;
  readonly name: string;
  readonly kind: AssetKind;
  readonly category: AssetCategory;
  readonly version: string;
  readonly sourceUrl?: string | null;
  readonly manifest?: import('./download/types.js').AssetDownloadManifest | null;
}

export interface UpdateAssetMetadataInput {
  readonly filePath?: string | null;
  readonly checksum?: string | null;
  readonly sizeBytes?: number | null;
  readonly status?: AssetStatus;
  readonly version?: string;
}

export interface AssetHealthIssue {
  readonly assetId: string;
  readonly code: string;
  readonly message: string;
  readonly severity: HealthStatus;
}

export interface AssetHealthReport {
  readonly assetId: string;
  readonly assetName: string;
  readonly status: HealthStatus;
  readonly issues: readonly AssetHealthIssue[];
  readonly checkedAt: string;
}

export interface ResolvedAsset {
  readonly asset: AssetRecord;
  readonly filePath: string;
  readonly version: AssetVersionRecord | null;
}

export interface MigrationRecord {
  readonly version: number;
  readonly name: string;
  readonly appliedAt: string;
}
