import { readFile } from 'node:fs/promises';

import type { TranslatorPort, TranslateSegmentsInput } from '../../ports/localization-ports.js';

interface SeamlessProviderSegment {
  readonly segmentId: string;
  readonly text: string;
}

interface SeamlessProviderPayload {
  readonly segments: readonly SeamlessProviderSegment[];
}

export class SeamlessAdapter implements TranslatorPort {
  translateSegments(
    input: TranslateSegmentsInput,
  ): Promise<readonly { readonly segmentId: string; readonly text: string }[]> {
    input.onProgress(0);

    const translated = input.segments.map((segment) => ({
      segmentId: segment.segmentId,
      text: `[${input.targetLanguageCode}] ${segment.text}`,
    }));

    input.onProgress(100);
    return Promise.resolve(translated);
  }
}

export class FixtureSeamlessAdapter implements TranslatorPort {
  constructor(private readonly options: { readonly fixturePath: string }) {}

  async translateSegments(
    input: TranslateSegmentsInput,
  ): Promise<readonly { readonly segmentId: string; readonly text: string }[]> {
    input.onProgress(0);

    const payload = JSON.parse(
      await readFile(this.options.fixturePath, 'utf8'),
    ) as SeamlessProviderPayload;
    const byId = new Map(payload.segments.map((segment) => [segment.segmentId, segment.text]));

    const translated = input.segments.map((segment) => ({
      segmentId: segment.segmentId,
      text: byId.get(segment.segmentId) ?? `[${input.targetLanguageCode}] ${segment.text}`,
    }));

    input.onProgress(100);
    return translated;
  }
}
