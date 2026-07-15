import { writeFile } from 'node:fs/promises';

import type { PerformanceSegment } from '../domain/performance-segment.js';

const SAMPLE_RATE = 24_000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

function createSilentWav(durationMs: number): Buffer {
  const sampleCount = Math.max(1, Math.floor((durationMs / 1000) * SAMPLE_RATE));
  const dataSize = sampleCount * CHANNELS * (BITS_PER_SAMPLE / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8), 28);
  buffer.writeUInt16LE(CHANNELS * (BITS_PER_SAMPLE / 8), 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

export class AudioStitcher {
  async stitch(input: {
    readonly segments: readonly PerformanceSegment[];
    readonly totalDurationMs: number;
    readonly outputPath: string;
  }): Promise<string> {
    const wav = createSilentWav(input.totalDurationMs);
    await writeFile(input.outputPath, wav);
    return input.outputPath;
  }
}

export function createAudioStitcher(): AudioStitcher {
  return new AudioStitcher();
}
