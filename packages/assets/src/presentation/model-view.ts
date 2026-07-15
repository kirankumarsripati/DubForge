import type { CatalogMetadata } from '../discovery/catalog-discovery.js';
import type { AssetRecord, DownloadRecord } from '../types.js';
import { ASSET_STATUSES, DOWNLOAD_STATUSES } from '../types.js';

export type ModelCategory = 'speech-to-text' | 'translation' | 'speech';

export type ModelStatus =
  'installed' | 'downloading' | 'verifying' | 'missing' | 'corrupted' | 'update-available';

export interface ModelView {
  readonly id: string;
  readonly name: string;
  readonly category: ModelCategory;
  readonly status: ModelStatus;
  readonly version: string;
  readonly latestVersion: string;
  readonly sizeBytes: number;
  readonly checksum: string | null;
  readonly downloadProgress: number | null;
  readonly requiredBy: readonly string[];
}

function mapCategory(category: AssetRecord['category']): ModelCategory {
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
  asset: AssetRecord,
  activeDownload?: DownloadRecord,
  metadata?: CatalogMetadata,
): ModelStatus {
  if (activeDownload !== undefined) {
    if (activeDownload.status === DOWNLOAD_STATUSES.VERIFYING) {
      return 'verifying';
    }

    return 'downloading';
  }

  if (
    asset.status === ASSET_STATUSES.READY &&
    metadata !== undefined &&
    metadata.latestVersion !== asset.version
  ) {
    return 'update-available';
  }

  switch (asset.status) {
    case ASSET_STATUSES.READY:
      return 'installed';
    case ASSET_STATUSES.MISSING:
      return 'missing';
    case ASSET_STATUSES.CORRUPTED:
      return 'corrupted';
    case ASSET_STATUSES.OUTDATED:
      return 'update-available';
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
  readonly asset: AssetRecord;
  readonly downloads: readonly DownloadRecord[];
  readonly metadata?: CatalogMetadata;
  readonly dependents: readonly string[];
}): ModelView {
  const activeDownload = resolveActiveDownload(input.downloads);
  const metadata = input.metadata;
  const requiredBy = metadata?.requiredBy ?? input.dependents;

  return {
    id: input.asset.id,
    name: input.asset.name,
    category: mapCategory(input.asset.category),
    status: mapStatus(input.asset, activeDownload, metadata),
    version: input.asset.version,
    latestVersion: metadata?.latestVersion ?? input.asset.version,
    sizeBytes: input.asset.sizeBytes ?? metadata?.estimatedSizeBytes ?? 0,
    checksum: input.asset.checksum,
    downloadProgress: resolveDownloadProgress(activeDownload),
    requiredBy,
  };
}
