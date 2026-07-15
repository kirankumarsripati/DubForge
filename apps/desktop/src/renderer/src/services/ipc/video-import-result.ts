import { videoImportErrorResponseSchema, type VideoImportResult } from '@dubforge/shared';
import type { VideoImportError, VideoMetadata } from '@dubforge/types';

export class VideoImportRejectedError extends Error {
  constructor(readonly importError: VideoImportError) {
    super(importError.description);
    this.name = 'VideoImportRejectedError';
  }
}

export function unwrapVideoImportResult(result: VideoImportResult): VideoMetadata {
  if (result.ok) {
    return result.data;
  }

  throw new VideoImportRejectedError(videoImportErrorResponseSchema.parse(result.error));
}

export function unwrapNullableVideoImportResult(
  result: VideoImportResult | null,
): VideoMetadata | null {
  if (result === null) {
    return null;
  }

  return unwrapVideoImportResult(result);
}
