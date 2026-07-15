import type { FfprobeOutput } from './ffprobe-schema';
import type { VideoProbeResult } from './types';

function parseFrameRate(value: string | undefined): number {
  if (value === undefined || value === '0/0' || value.length === 0) {
    return 0;
  }

  const parts = value.split('/');
  if (parts.length !== 2) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

function parseDurationSeconds(duration: string | undefined): number {
  if (duration === undefined) {
    return 0;
  }

  const parsed = Number(duration);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBitrateKbps(bitRate: string | undefined): number {
  if (bitRate === undefined) {
    return 0;
  }

  const parsed = Number(bitRate);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed / 1000);
}

function normalizeCodecName(codecName: string | undefined): string {
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

  return codecName.toUpperCase();
}

export function parseFfprobeOutput(output: FfprobeOutput): VideoProbeResult {
  const videoStream = output.streams.find((stream) => stream.codec_type === 'video');
  if (videoStream === undefined) {
    throw new Error('No video stream found in file.');
  }

  const width = videoStream.width ?? 0;
  const height = videoStream.height ?? 0;
  if (width <= 0 || height <= 0) {
    throw new Error('Video stream is missing valid dimensions.');
  }

  const frameRate = parseFrameRate(videoStream.avg_frame_rate ?? videoStream.r_frame_rate);
  const audioTrackCount = output.streams.filter((stream) => stream.codec_type === 'audio').length;
  const durationSeconds = parseDurationSeconds(output.format.duration);

  return {
    container: output.format.format_name,
    durationSeconds,
    bitrateKbps: parseBitrateKbps(output.format.bit_rate),
    videoStream: {
      codec: normalizeCodecName(videoStream.codec_name),
      width,
      height,
      frameRate,
    },
    audioTrackCount,
  };
}
