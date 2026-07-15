import {
  createTranscriptionPlatform,
  CANONICAL_TRANSCRIPT_VERSION,
  TRANSCRIPT_SOURCES,
  type CanonicalTranscript,
} from '@dubforge/transcription';

export function seedEnglishCanonicalTranscript(input: {
  readonly platform: ReturnType<typeof createTranscriptionPlatform>;
  readonly workflowId: string;
  readonly jobId: string;
}): CanonicalTranscript {
  const transcript: CanonicalTranscript = {
    version: CANONICAL_TRANSCRIPT_VERSION,
    id: 'golden-source-transcript',
    workflowId: input.workflowId,
    jobId: input.jobId,
    languageCode: 'en',
    durationMs: 5000,
    source: TRANSCRIPT_SOURCES.SPEECH_RECOGNITION,
    createdAt: new Date().toISOString(),
    segments: [
      {
        id: 'seg-hello',
        startMs: 0,
        endMs: 2500,
        text: 'Hello world.',
        languageCode: 'en',
        confidence: 0.92,
        speakerId: null,
      },
      {
        id: 'seg-golden',
        startMs: 2500,
        endMs: 5000,
        text: 'This is a golden transcript.',
        languageCode: 'en',
        confidence: 0.88,
        speakerId: null,
      },
    ],
  };

  input.platform.repository.saveCanonicalTranscript(transcript, 85);
  return transcript;
}
