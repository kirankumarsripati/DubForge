export interface RecognizeSpeechInput {
  readonly audioPath: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly languageCode: string;
  readonly durationSeconds: number;
  readonly onProgress: (progress: number) => void;
}

/** Internal provider output — never exported from the transcription package public API. */
export interface ProviderSpeechSegment {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly confidence: number | null;
  readonly speakerId?: string | null;
}

export interface RecognizeSpeechResult {
  readonly segments: readonly ProviderSpeechSegment[];
  readonly durationSeconds: number;
  readonly durationMs: number;
}

export interface RecognizeSpeechPort {
  recognize(input: RecognizeSpeechInput): Promise<RecognizeSpeechResult>;
}

export interface TranslateTranscriptInput {
  readonly source: import('../domain/canonical-transcript.js').CanonicalTranscript;
  readonly targetLanguageCode: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly onProgress: (progress: number) => void;
}

export interface TranslateTranscriptPort {
  translate(
    input: TranslateTranscriptInput,
  ): Promise<import('../domain/canonical-transcript.js').CanonicalTranscript>;
}
