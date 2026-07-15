import { randomUUID } from 'node:crypto';

import { AUDIO_COMPOSITION_VERSION } from './constants.js';
import type { AudioLayers } from './audio-layers.js';

export interface AudioComposition {
  readonly version: typeof AUDIO_COMPOSITION_VERSION;
  readonly id: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly languageCode: string;
  readonly alignmentPlanId: string;
  readonly layers: AudioLayers;
  readonly alignedSpeechPath: string;
  readonly composedAudioPath: string;
  readonly durationMs: number;
  readonly createdAt: string;
}

export function createAudioComposition(input: {
  readonly workflowId: string;
  readonly jobId: string;
  readonly languageCode: string;
  readonly alignmentPlanId: string;
  readonly layers: AudioLayers;
  readonly alignedSpeechPath: string;
  readonly composedAudioPath: string;
  readonly durationMs: number;
}): AudioComposition {
  return {
    version: AUDIO_COMPOSITION_VERSION,
    id: randomUUID(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    languageCode: input.languageCode,
    alignmentPlanId: input.alignmentPlanId,
    layers: input.layers,
    alignedSpeechPath: input.alignedSpeechPath,
    composedAudioPath: input.composedAudioPath,
    durationMs: input.durationMs,
    createdAt: new Date().toISOString(),
  };
}

export function serializeAudioComposition(composition: AudioComposition): string {
  return JSON.stringify(composition, null, 2);
}

export function deserializeAudioComposition(content: string): AudioComposition {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const version = parsed.version;
  if (typeof version !== 'string' || version !== AUDIO_COMPOSITION_VERSION) {
    throw new Error(`Unsupported audio composition version "${String(version)}".`);
  }

  return parsed as unknown as AudioComposition;
}
