export interface VoicePreviewResult {
  readonly voiceId: string;
  readonly durationMs: number;
}

export interface VoicePreviewService {
  previewVoice(voiceId: string): Promise<VoicePreviewResult>;
}

const PREVIEW_DURATION_MS = 1200;

export class MockVoicePreviewService implements VoicePreviewService {
  async previewVoice(voiceId: string): Promise<VoicePreviewResult> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, PREVIEW_DURATION_MS);
    });

    return {
      voiceId,
      durationMs: PREVIEW_DURATION_MS,
    };
  }
}

export const voicePreviewService = new MockVoicePreviewService();
