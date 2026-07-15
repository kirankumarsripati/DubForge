import { readFile } from 'node:fs/promises';

import type {
  SpeechSynthesizerPort,
  SynthesizeSegmentInput,
  SynthesizedSegmentAudio,
} from '../../ports/voice-performance-ports.js';
import { writeSegmentPlaceholder } from '../../engine/speech-synthesis-engine.js';

interface KokoroProviderSegment {
  readonly segmentId: string;
  readonly durationMs: number;
}

interface KokoroProviderPayload {
  readonly segments: readonly KokoroProviderSegment[];
}

export class KokoroAdapter implements SpeechSynthesizerPort {
  synthesizeSegment(input: SynthesizeSegmentInput): Promise<SynthesizedSegmentAudio> {
    const durationMs = Math.max(250, input.text.length * 40);
    return writeSegmentPlaceholder(input.outputPath, input.segmentId).then(() => ({
      segmentId: input.segmentId,
      audioPath: input.outputPath,
      durationMs,
    }));
  }
}

export class FixtureKokoroAdapter implements SpeechSynthesizerPort {
  constructor(private readonly options: { readonly fixturePath: string }) {}

  async synthesizeSegment(input: SynthesizeSegmentInput): Promise<SynthesizedSegmentAudio> {
    const payload = JSON.parse(
      await readFile(this.options.fixturePath, 'utf8'),
    ) as KokoroProviderPayload;
    const match = payload.segments.find((segment) => segment.segmentId === input.segmentId);
    const durationMs = match?.durationMs ?? Math.max(250, input.text.length * 40);

    await writeSegmentPlaceholder(input.outputPath, input.segmentId);

    return {
      segmentId: input.segmentId,
      audioPath: input.outputPath,
      durationMs,
    };
  }
}
