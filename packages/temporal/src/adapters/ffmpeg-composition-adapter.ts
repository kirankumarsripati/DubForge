import { readFile } from 'node:fs/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type {
  AudioComposerPort,
  ComposeLayersInput,
  ComposedAudioResult,
} from '../ports/temporal-ports.js';

interface FfmpegProviderPayload {
  readonly durationMs: number;
}

export class FfmpegCompositionAdapter implements AudioComposerPort {
  async composeLayers(input: ComposeLayersInput): Promise<ComposedAudioResult> {
    await mkdir(dirname(input.outputPath), { recursive: true });
    await writeFile(
      input.outputPath,
      `COMPOSED_AUDIO:${input.speechPath}:${input.backgroundPath ?? 'none'}`,
      'utf8',
    );

    return {
      outputPath: input.outputPath,
      durationMs: input.durationMs,
    };
  }
}

export class FixtureFfmpegCompositionAdapter implements AudioComposerPort {
  constructor(private readonly options: { readonly fixturePath: string }) {}

  async composeLayers(input: ComposeLayersInput): Promise<ComposedAudioResult> {
    const payload = JSON.parse(
      await readFile(this.options.fixturePath, 'utf8'),
    ) as FfmpegProviderPayload;

    await mkdir(dirname(input.outputPath), { recursive: true });
    await writeFile(input.outputPath, `COMPOSED_AUDIO:${String(input.durationMs)}`, 'utf8');

    return {
      outputPath: input.outputPath,
      durationMs: payload.durationMs,
    };
  }
}
