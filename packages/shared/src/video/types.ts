export interface VideoStreamInfo {
  readonly codec: string;
  readonly width: number;
  readonly height: number;
  readonly frameRate: number;
}

export interface VideoProbeResult {
  readonly container: string;
  readonly durationSeconds: number;
  readonly bitrateKbps: number;
  readonly videoStream: VideoStreamInfo;
  readonly audioTrackCount: number;
}

export interface VideoFileStats {
  readonly filePath: string;
  readonly filename: string;
  readonly fileSizeBytes: number;
  readonly fileModifiedAtMs: number;
}

export interface CachedVideoRecord {
  readonly id: string;
  readonly filePath: string;
  readonly filename: string;
  readonly fileSizeBytes: number;
  readonly fileModifiedAtMs: number;
  readonly durationSeconds: number;
  readonly resolution: string;
  readonly codec: string;
  readonly audioTracks: number;
  readonly frameRate: number;
  readonly bitrateKbps: number;
  readonly thumbnailTimestampSeconds: number;
  readonly cachedAt: string;
}
