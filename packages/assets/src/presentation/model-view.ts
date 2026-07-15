import type { RegisteredAsset } from '../registry/asset-manifest-registry.js';
import type { AssetRecord, DownloadRecord } from '../types.js';
import { ASSET_STATUSES, DOWNLOAD_STATUSES } from '../types.js';

export type ModelCategory = 'speech-to-text' | 'translation' | 'speech';

export type ModelHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type ModelStatus =
  'not-installed' | 'installed' | 'downloading' | 'verifying' | 'corrupted' | 'update-available';

export interface ModelView {
  readonly id: string;
  readonly name: string;
  readonly category: ModelCategory;
  readonly status: ModelStatus;
  readonly version: string;
  readonly latestVersion: string;
  readonly sizeBytes: number;
  readonly checksum: string | null;
  readonly installLocation: string | null;
  readonly health: ModelHealthStatus | null;
  readonly downloadProgress: number | null;
  readonly requiredBy: readonly string[];
}

function mapCategory(category: RegisteredAsset['category']): ModelCategory {
  switch (category) {
    case 'speech-to-text':
      return 'speech-to-text';
    case 'translation':
      return 'translation';
    case 'speech':
      return 'speech';
    case 'extension-binary':
      return 'speech';
  }
}

function resolveActiveDownload(downloads: readonly DownloadRecord[]): DownloadRecord | undefined {
  return downloads.find(
    (download) =>
      download.status === DOWNLOAD_STATUSES.QUEUED ||
      download.status === DOWNLOAD_STATUSES.DOWNLOADING ||
      download.status === DOWNLOAD_STATUSES.VERIFYING,
  );
}

function mapStatus(
  registered: RegisteredAsset,
  installation: AssetRecord | null,
  activeDownload?: DownloadRecord,
): ModelStatus {
  if (installation === null) {
    if (activeDownload !== undefined) {
      return activeDownload.status === DOWNLOAD_STATUSES.VERIFYING ? 'verifying' : 'downloading';
    }

    return 'not-installed';
  }

  if (activeDownload !== undefined) {
    return activeDownload.status === DOWNLOAD_STATUSES.VERIFYING ? 'verifying' : 'downloading';
  }

  if (
    installation.status === ASSET_STATUSES.READY &&
    registered.latestVersion !== installation.version
  ) {
    return 'update-available';
  }

  switch (installation.status) {
    case ASSET_STATUSES.READY:
      return 'installed';
    case ASSET_STATUSES.CORRUPTED:
      return 'corrupted';
    case ASSET_STATUSES.OUTDATED:
      return 'update-available';
    case ASSET_STATUSES.MISSING:
      return 'not-installed';
    case ASSET_STATUSES.DOWNLOADING:
      return 'downloading';
    case ASSET_STATUSES.VERIFYING:
      return 'verifying';
  }
}

function resolveDownloadProgress(activeDownload?: DownloadRecord): number | null {
  if (activeDownload?.totalBytes == null) {
    return null;
  }

  if (activeDownload.totalBytes <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((activeDownload.bytesDownloaded / activeDownload.totalBytes) * 100),
  );
}

export function toModelView(input: {
  readonly registered: RegisteredAsset;
  readonly installation: AssetRecord | null;
  readonly downloads: readonly DownloadRecord[];
  readonly health: ModelHealthStatus | null;
}): ModelView {
  const activeDownload = resolveActiveDownload(input.downloads);
  const status = mapStatus(input.registered, input.installation, activeDownload);
  const isInstalled = status === 'installed' || status === 'update-available';

  return {
    id: input.registered.id,
    name: input.registered.name,
    category: mapCategory(input.registered.category),
    status,
    version: isInstalled
      ? (input.installation?.version ?? input.registered.version)
      : input.registered.version,
    latestVersion: input.registered.latestVersion,
    sizeBytes: isInstalled
      ? (input.installation?.sizeBytes ?? input.registered.estimatedSizeBytes)
      : input.registered.estimatedSizeBytes,
    checksum: isInstalled ? (input.installation?.checksum ?? null) : null,
    installLocation: isInstalled ? (input.installation?.filePath ?? null) : null,
    health: isInstalled ? input.health : null,
    downloadProgress: resolveDownloadProgress(activeDownload),
    requiredBy: input.registered.requiredBy,
  };
}
