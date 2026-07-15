import type { LocalizedDocument } from '@dubforge/localization';

import { createVoiceProfile } from '../domain/voice-profile.js';
import type { PerformancePlan, PlannedSegment } from '../ports/voice-performance-ports.js';
import { PronunciationResolver } from './pronunciation-resolver.js';

export interface PerformancePlannerInput {
  readonly document: LocalizedDocument;
  readonly voiceId: string;
  readonly voiceLabel: string;
  readonly artifactRoot: string;
  readonly nodeId: string;
  readonly pronunciationResolver: PronunciationResolver;
}

export class PerformancePlanner {
  plan(input: PerformancePlannerInput): PerformancePlan {
    const voiceProfile = createVoiceProfile({
      id: input.voiceId,
      label: input.voiceLabel,
      languageCode: input.document.targetLanguageCode,
    });

    const segments: PlannedSegment[] = input.document.segments.map((segment) => ({
      segmentId: segment.id,
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: segment.text,
      pronunciationText: input.pronunciationResolver.resolve(
        segment.text,
        input.document.targetLanguageCode,
      ),
      outputPath: `${input.artifactRoot}/${input.nodeId}-${segment.id}.wav`,
    }));

    return {
      workflowId: input.document.workflowId,
      jobId: input.document.jobId,
      languageCode: input.document.targetLanguageCode,
      voiceProfile,
      localizedDocumentId: input.document.id,
      durationMs: input.document.durationMs,
      segments,
    };
  }
}

export function createPerformancePlanner(): PerformancePlanner {
  return new PerformancePlanner();
}
