import {
  createCanonicalTranscript,
  type CanonicalTranscript,
} from '../../domain/canonical-transcript.js';
import { TRANSCRIPT_SOURCES } from '../../domain/constants.js';
import type {
  TranslateTranscriptInput,
  TranslateTranscriptPort,
} from '../../ports/transcription-ports.js';

const TRANSLATION_PLACEHOLDERS: Readonly<Record<string, string>> = {
  hi: 'नमस्ते दुनिया।',
  es: 'Hola mundo.',
  fr: 'Bonjour le monde.',
};

export class CanonicalTranslateAdapter implements TranslateTranscriptPort {
  async translate(input: TranslateTranscriptInput): Promise<CanonicalTranscript> {
    input.onProgress(0);

    const translatedSegments = input.source.segments.map((segment) => ({
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: `[${input.targetLanguageCode}] ${segment.text}`,
      languageCode: input.targetLanguageCode,
      confidence: segment.confidence,
      speakerId: segment.speakerId,
    }));

    const transcript = createCanonicalTranscript({
      workflowId: input.workflowId,
      jobId: input.jobId,
      languageCode: input.targetLanguageCode,
      durationMs: input.source.durationMs,
      source: TRANSCRIPT_SOURCES.TRANSLATION,
      segments: translatedSegments,
    });

    input.onProgress(100);
    return transcript;
  }
}

export function translatePlainPreview(languageCode: string): string {
  return TRANSLATION_PLACEHOLDERS[languageCode] ?? `Translated (${languageCode})`;
}
