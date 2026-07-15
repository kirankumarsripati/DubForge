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
