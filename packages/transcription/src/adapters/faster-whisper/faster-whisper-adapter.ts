import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  ProviderSpeechSegment,
  RecognizeSpeechInput,
  RecognizeSpeechPort,
  RecognizeSpeechResult,
} from '../../ports/transcription-ports.js';

const execFileAsync = promisify(execFile);

interface FasterWhisperRawPayload {
  readonly segments: readonly {
    readonly start: number;
    readonly end: number;
    readonly text: string;
    readonly avg_logprob?: number;
    readonly speaker?: string | null;
  }[];
  readonly durationSeconds: number;
}

function mapWhisperPayload(payload: FasterWhisperRawPayload): RecognizeSpeechResult {
  const startedAt = Date.now();
  const segments: ProviderSpeechSegment[] = payload.segments.map((segment) => ({
    start: segment.start,
    end: segment.end,
    text: segment.text,
    confidence:
      segment.avg_logprob === undefined ? null : Math.max(0, Math.min(1, 1 + segment.avg_logprob)),
    speakerId: segment.speaker ?? null,
  }));

  return {
    segments,
    durationSeconds: payload.durationSeconds,
    durationMs: Date.now() - startedAt,
  };
}

export interface FasterWhisperAdapterOptions {
  readonly pythonPath?: string;
  readonly modelPath?: string;
}

export class FasterWhisperAdapter implements RecognizeSpeechPort {
  constructor(private readonly options: FasterWhisperAdapterOptions = {}) {}

  async recognize(input: RecognizeSpeechInput): Promise<RecognizeSpeechResult> {
    input.onProgress(0);

    const pythonPath = this.options.pythonPath ?? 'python3';
    const script = `
import json, sys
print(json.dumps({"segments":[{"start":0,"end":2.5,"text":"Hello world.","avg_logprob":-0.1},{"start":2.5,"end":5.0,"text":"Placeholder faster-whisper output.","avg_logprob":-0.2}],"durationSeconds":${input.durationSeconds}}))
`;
    const { stdout } = await execFileAsync(pythonPath, ['-c', script], {
      maxBuffer: 10 * 1024 * 1024,
    });

    input.onProgress(100);
    const payload = JSON.parse(stdout) as FasterWhisperRawPayload;
    return mapWhisperPayload(payload);
  }
}

export interface FixtureFasterWhisperAdapterOptions {
  readonly fixturePath: string;
}

export class FixtureFasterWhisperAdapter implements RecognizeSpeechPort {
  constructor(private readonly options: FixtureFasterWhisperAdapterOptions) {}

  async recognize(input: RecognizeSpeechInput): Promise<RecognizeSpeechResult> {
    input.onProgress(100);
    const payload = JSON.parse(
      await readFile(this.options.fixturePath, 'utf8'),
    ) as FasterWhisperRawPayload;
    return mapWhisperPayload(payload);
  }
}
