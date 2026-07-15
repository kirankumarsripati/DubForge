import { readFile } from 'node:fs/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type {
  AlignSegmentInput,
  AlignedSegmentAudio,
  AudioAlignerPort,
} from '../ports/temporal-ports.js';

interface RubberBandProviderSegment {
  readonly segmentId: string;
  readonly durationMs: number;
}

interface RubberBandProviderPayload {
  readonly segments: readonly RubberBandProviderSegment[];
}

export class RubberBandAdapter implements AudioAlignerPort {
  async alignSegment(input: AlignSegmentInput): Promise<AlignedSegmentAudio> {
    await mkdir(dirname(input.outputPath), { recursive: true });
    await writeFile(
      input.outputPath,
      `RUBBERBAND:${input.segmentId}:${String(input.stretchRatio)}`,
      'utf8',
    );

    return {
      segmentId: input.segmentId,
      outputPath: input.outputPath,
      durationMs: input.targetDurationMs,
    };
  }
}

export class FixtureRubberBandAdapter implements AudioAlignerPort {
  constructor(private readonly options: { readonly fixturePath: string }) {}

  async alignSegment(input: AlignSegmentInput): Promise<AlignedSegmentAudio> {
    const payload = JSON.parse(
      await readFile(this.options.fixturePath, 'utf8'),
    ) as RubberBandProviderPayload;
    const match = payload.segments.find((segment) => segment.segmentId === input.segmentId);
    const durationMs = match?.durationMs ?? input.targetDurationMs;

    await mkdir(dirname(input.outputPath), { recursive: true });
    await writeFile(input.outputPath, `RUBBERBAND:${input.segmentId}`, 'utf8');

    return {
      segmentId: input.segmentId,
      outputPath: input.outputPath,
      durationMs,
    };
  }
}
