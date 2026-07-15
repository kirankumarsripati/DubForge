export interface Duration {
  readonly seconds: number;
}

export function createDuration(seconds: number): Duration {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error('Duration must be a non-negative finite number.');
  }

  return { seconds };
}

export function formatDuration(duration: Duration): string {
  const totalSeconds = Math.floor(duration.seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours)}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}
