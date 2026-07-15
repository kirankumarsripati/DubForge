export interface Codec {
  readonly name: string;
}

export function createCodec(name: string): Codec {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Codec name must not be empty.');
  }

  return { name: trimmed };
}

export function normalizeCodecName(codecName: string | undefined): string {
  if (codecName === undefined || codecName.length === 0) {
    return 'Unknown';
  }

  const normalized = codecName.toLowerCase();
  if (normalized === 'h264') {
    return 'H.264';
  }
  if (normalized === 'hevc' || normalized === 'h265') {
    return 'H.265';
  }
  if (normalized === 'vp9') {
    return 'VP9';
  }
  if (normalized === 'av1') {
    return 'AV1';
  }
  if (normalized === 'aac') {
    return 'AAC';
  }
  if (normalized === 'mp3') {
    return 'MP3';
  }

  return codecName.toUpperCase();
}
