import { randomUUID } from 'node:crypto';

import { VOICE_PERFORMANCE_VERSION } from './constants.js';
import type { PerformanceSegment } from './performance-segment.js';
import type { VoiceProfile } from './voice-profile.js';

export interface VoicePerformance {
  readonly version: typeof VOICE_PERFORMANCE_VERSION;
  readonly id: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly localizedDocumentId: string;
  readonly languageCode: string;
  readonly voiceProfile: VoiceProfile;
  readonly segments: readonly PerformanceSegment[];
  readonly stitchedAudioPath: string | null;
  readonly alignedAudioPath: string | null;
  readonly durationMs: number;
  readonly createdAt: string;
}

export interface CreateVoicePerformanceInput {
  readonly workflowId: string;
  readonly jobId: string;
  readonly localizedDocumentId: string;
  readonly languageCode: string;
  readonly voiceProfile: VoiceProfile;
  readonly segments: readonly PerformanceSegment[];
  readonly stitchedAudioPath: string | null;
  readonly alignedAudioPath: string | null;
  readonly durationMs: number;
}

export function createVoicePerformance(input: CreateVoicePerformanceInput): VoicePerformance {
  return {
    version: VOICE_PERFORMANCE_VERSION,
    id: randomUUID(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    localizedDocumentId: input.localizedDocumentId,
    languageCode: input.languageCode,
    voiceProfile: input.voiceProfile,
    segments: input.segments,
    stitchedAudioPath: input.stitchedAudioPath,
    alignedAudioPath: input.alignedAudioPath,
    durationMs: input.durationMs,
    createdAt: new Date().toISOString(),
  };
}

export function serializeVoicePerformance(performance: VoicePerformance): string {
  return JSON.stringify(performance, null, 2);
}

export function deserializeVoicePerformance(content: string): VoicePerformance {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const version = parsed.version;
  if (typeof version !== 'string' || version !== VOICE_PERFORMANCE_VERSION) {
    throw new Error(`Unsupported voice performance version "${String(version)}".`);
  }

  return parsed as unknown as VoicePerformance;
}
