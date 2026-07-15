import {
  createLocalizedDocument,
  createLocalizedSegment,
  TRANSLATION_SEGMENT_SOURCES,
} from '@dubforge/localization';
import type { LocalizationRepository } from '@dubforge/localization';
import {
  createPerformanceSegment,
  createVoicePerformance,
  createVoiceProfile,
} from '@dubforge/voice-performance';
import type { VoicePerformanceRepository } from '@dubforge/voice-performance';

export function seedLocalizedDocument(input: {
  readonly repository: LocalizationRepository;
  readonly workflowId: string;
  readonly jobId: string;
  readonly languageCode?: string;
}) {
  const languageCode = input.languageCode ?? 'hi';
  const document = createLocalizedDocument({
    workflowId: input.workflowId,
    jobId: input.jobId,
    sourceLanguageCode: 'en',
    targetLanguageCode: languageCode,
    sourceTranscriptId: 'golden-source-transcript',
    durationMs: 5000,
    segments: [
      createLocalizedSegment({
        id: 'seg-hello',
        startMs: 0,
        endMs: 2500,
        sourceText: 'Hello world.',
        text: 'नमस्ते दुनिया।',
        languageCode,
        confidence: 0.9,
        speakerId: null,
        translationSource: TRANSLATION_SEGMENT_SOURCES.TRANSLATOR,
      }),
      createLocalizedSegment({
        id: 'seg-golden',
        startMs: 2500,
        endMs: 5000,
        sourceText: 'This is a golden transcript.',
        text: 'यह एक स्वर्णिम प्रतिलेख है।',
        languageCode,
        confidence: 0.9,
        speakerId: null,
        translationSource: TRANSLATION_SEGMENT_SOURCES.TRANSLATOR,
      }),
    ],
  });

  input.repository.saveLocalizedDocument(document, 90);
  return document;
}

export function seedVoicePerformance(input: {
  readonly repository: VoicePerformanceRepository;
  readonly workflowId: string;
  readonly jobId: string;
  readonly localizedDocumentId: string;
  readonly languageCode?: string;
  readonly artifactRoot: string;
  readonly nodeId: string;
}) {
  const languageCode = input.languageCode ?? 'hi';
  const segments = [
    createPerformanceSegment({
      id: 'seg-hello',
      startMs: 0,
      endMs: 2500,
      text: 'नमस्ते दुनिया।',
      pronunciationText: 'नमस्ते दुनिया।',
      audioPath: `${input.artifactRoot}/${input.nodeId}-seg-hello.wav`,
      audioDurationMs: 2200,
    }),
    createPerformanceSegment({
      id: 'seg-golden',
      startMs: 2500,
      endMs: 5000,
      text: 'यह एक स्वर्णिम प्रतिलेख है।',
      pronunciationText: 'यह एक स्वर्णिम प्रतिलेख है।',
      audioPath: `${input.artifactRoot}/${input.nodeId}-seg-golden.wav`,
      audioDurationMs: 2800,
    }),
  ];

  const performance = createVoicePerformance({
    workflowId: input.workflowId,
    jobId: input.jobId,
    localizedDocumentId: input.localizedDocumentId,
    languageCode,
    voiceProfile: createVoiceProfile({ id: 'hi-default', label: 'Hindi Default', languageCode }),
    segments,
    stitchedAudioPath: `${input.artifactRoot}/${input.nodeId}-${languageCode}.wav`,
    alignedAudioPath: null,
    durationMs: 5000,
  });

  input.repository.saveVoicePerformance(performance);
  return performance;
}
