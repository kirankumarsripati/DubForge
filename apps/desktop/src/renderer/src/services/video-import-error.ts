import type { VideoImportError } from '@dubforge/types';

export function isVideoImportError(error: unknown): error is VideoImportError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as Partial<VideoImportError>;
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.recoveryAction === 'string'
  );
}
