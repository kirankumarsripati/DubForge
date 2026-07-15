import type { DownloadSourceType } from './source-types.js';

export interface DownloadSource {
  readonly type: DownloadSourceType;
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface AssetDownloadManifest {
  readonly sources: readonly DownloadSource[];
  readonly checksum: string | null;
  readonly filename: string;
}

export interface DownloadProgressUpdate {
  readonly bytesDownloaded: number;
  readonly totalBytes: number | null;
}

export interface DownloadExecutionContext {
  readonly assetId: string;
  readonly version: string;
  readonly tempPath: string;
  readonly resumeFromByte: number;
  readonly signal: AbortSignal;
  readonly onProgress: (update: DownloadProgressUpdate) => void;
}

export interface DownloadProvider {
  readonly type: DownloadSourceType;
  canHandle(source: DownloadSource): boolean;
  download(source: DownloadSource, context: DownloadExecutionContext): Promise<void>;
  probeTotalBytes?(source: DownloadSource): Promise<number | null>;
}

export interface HttpDownloadOptions {
  readonly url: string;
  readonly destinationPath: string;
  readonly resumeFromByte: number;
  readonly signal: AbortSignal;
  readonly headers?: Readonly<Record<string, string>>;
  readonly maxRetries?: number;
  readonly onProgress: (update: DownloadProgressUpdate) => void;
}
