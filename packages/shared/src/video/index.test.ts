import { describe, expect, it } from 'vitest';
import { parseFfprobeOutput } from './ffprobe-parser';
import type { FfprobeOutput } from './ffprobe-schema';
import { calculateThumbnailTimestampSeconds } from './thumbnail';
import {
  createValidationFailure,
  validateVideoExtension,
  validateVideoFileStats,
  validateVideoProbe,
} from './validation';

const SAMPLE_PROBE_OUTPUT: FfprobeOutput = {
  format: {
    format_name: 'mov,mp4,m4a,3gp,3g2,mj2',
    duration: '3720.000000',
    bit_rate: '3200000',
  },
  streams: [
    {
      codec_type: 'video',
      codec_name: 'h264',
      width: 1920,
      height: 1080,
      avg_frame_rate: '30000/1001',
    },
    {
      codec_type: 'audio',
      codec_name: 'aac',
    },
  ],
};

describe('parseFfprobeOutput', () => {
  it('parses duration, codec, resolution, and audio tracks', () => {
    const result = parseFfprobeOutput(SAMPLE_PROBE_OUTPUT);

    expect(result.durationSeconds).toBe(3720);
    expect(result.bitrateKbps).toBe(3200);
    expect(result.videoStream.codec).toBe('H.264');
    expect(result.videoStream.width).toBe(1920);
    expect(result.videoStream.height).toBe(1080);
    expect(result.audioTrackCount).toBe(1);
    expect(result.videoStream.frameRate).toBeCloseTo(29.97, 2);
  });

  it('throws when no video stream exists', () => {
    expect(() =>
      parseFfprobeOutput({
        format: { format_name: 'mp4' },
        streams: [{ codec_type: 'audio', codec_name: 'aac' }],
      }),
    ).toThrow('No video stream found in file.');
  });
});

describe('calculateThumbnailTimestampSeconds', () => {
  it('returns approximately 10% of duration', () => {
    expect(calculateThumbnailTimestampSeconds(100)).toBe(10);
    expect(calculateThumbnailTimestampSeconds(3720)).toBe(372);
  });
});

describe('validateVideoExtension', () => {
  it('accepts supported extensions', () => {
    expect(validateVideoExtension('clip.mp4')).toBeNull();
    expect(validateVideoExtension('clip.mkv')).toBeNull();
  });

  it('rejects unsupported extensions', () => {
    expect(validateVideoExtension('clip.avi')?.code).toBe('unsupported-extension');
  });
});

describe('validateVideoFileStats', () => {
  it('rejects files larger than the configured limit', () => {
    const failure = validateVideoFileStats({
      filePath: '/tmp/large.mp4',
      filename: 'large.mp4',
      fileSizeBytes: 3 * 1024 * 1024 * 1024,
      fileModifiedAtMs: Date.now(),
    });

    expect(failure?.code).toBe('file-too-large');
  });
});

describe('validateVideoProbe', () => {
  it('rejects videos without audio', () => {
    const probe = parseFfprobeOutput({
      format: { format_name: 'mp4', duration: '120' },
      streams: [{ codec_type: 'video', codec_name: 'h264', width: 1280, height: 720 }],
    });

    expect(validateVideoProbe(probe)?.code).toBe('missing-audio-stream');
  });

  it('rejects videos longer than 120 minutes', () => {
    const probe = parseFfprobeOutput({
      format: { format_name: 'mp4', duration: '7500' },
      streams: [
        { codec_type: 'video', codec_name: 'h264', width: 1280, height: 720 },
        { codec_type: 'audio', codec_name: 'aac' },
      ],
    });

    expect(validateVideoProbe(probe)?.code).toBe('duration-too-long');
  });

  it('accepts valid probe results', () => {
    expect(validateVideoProbe(parseFfprobeOutput(SAMPLE_PROBE_OUTPUT))).toBeNull();
  });
});

describe('createValidationFailure', () => {
  it('returns user-facing validation messages', () => {
    const failure = createValidationFailure('unsupported-extension');

    expect(failure.title).toBe('Unsupported file type');
    expect(failure.recoveryAction.length).toBeGreaterThan(0);
  });
});
