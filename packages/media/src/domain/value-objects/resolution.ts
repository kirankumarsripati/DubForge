export interface Resolution {
  readonly width: number;
  readonly height: number;
}

export function createResolution(width: number, height: number): Resolution {
  if (!Number.isInteger(width) || width <= 0) {
    throw new Error('Resolution width must be a positive integer.');
  }

  if (!Number.isInteger(height) || height <= 0) {
    throw new Error('Resolution height must be a positive integer.');
  }

  return { width, height };
}

export function formatResolution(resolution: Resolution): string {
  return `${String(resolution.width)}x${String(resolution.height)}`;
}

export function resolutionLabel(resolution: Resolution): string {
  const height = resolution.height;
  if (height >= 2160) {
    return '4K';
  }
  if (height >= 1440) {
    return '2K';
  }
  if (height >= 1080) {
    return '1080p';
  }
  if (height >= 720) {
    return '720p';
  }

  return formatResolution(resolution);
}
