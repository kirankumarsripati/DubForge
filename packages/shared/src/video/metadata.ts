import type { VideoMetadata } from '@dubforge/types';
import type { CachedVideoRecord } from './types';

export function toVideoMetadata(
  record: CachedVideoRecord,
  thumbnailUrl: string | null,
): VideoMetadata {
  return {
    id: record.id,
    filename: record.filename,
    durationSeconds: record.durationSeconds,
    resolution: record.resolution,
    codec: record.codec,
    audioTracks: record.audioTracks,
    fileSizeBytes: record.fileSizeBytes,
    frameRate: record.frameRate,
    bitrateKbps: record.bitrateKbps,
    thumbnailUrl,
  };
}
