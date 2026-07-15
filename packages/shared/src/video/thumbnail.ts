import { THUMBNAIL_POSITION_RATIO } from './constants';

export function calculateThumbnailTimestampSeconds(durationSeconds: number): number {
  if (durationSeconds <= 0) {
    return 0;
  }

  return durationSeconds * THUMBNAIL_POSITION_RATIO;
}
