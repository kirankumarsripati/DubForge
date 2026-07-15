import { TRANSLATION_SEGMENT_SOURCES } from '../domain/constants.js';
import {
  createLocalizedDocument,
  createLocalizedSegment,
  type LocalizedSegment,
} from '../domain/localized-document.js';
import { createLocalizedDocumentAggregate } from '../domain/localized-document-aggregate.js';
import { applyGlossaryToText } from './glossary-engine.js';
import { analyzeLocalizationQuality } from './quality-engine.js';
import type { TranslatorSegmentInput } from '../ports/localization-ports.js';
import type { LocalizationRepository } from '../repository/localization-repository.js';
import type { LocalizationEngineInput } from './localization-engine-types.js';
import type { TranslatorPort } from '../ports/localization-ports.js';

export type { LocalizationEngineInput } from './localization-engine-types.js';

export class LocalizationEngine {
  constructor(
    private readonly options: {
      readonly translator: TranslatorPort;
      readonly repository: LocalizationRepository;
    },
  ) {}

  async localize(input: LocalizationEngineInput) {
    input.onProgress(0);

    const glossaryEntries = input.glossaryEntries.filter(
      (entry) =>
        entry.sourceLanguageCode === input.source.languageCode &&
        entry.targetLanguageCode === input.targetLanguageCode,
    );

    const localizedSegments: LocalizedSegment[] = [];
    const translatorQueue: TranslatorSegmentInput[] = [];

    for (const segment of input.source.segments) {
      const memoryHit = this.options.repository.findTranslationMemory({
        sourceLanguageCode: input.source.languageCode,
        targetLanguageCode: input.targetLanguageCode,
        sourceText: segment.text,
      });

      if (memoryHit !== null) {
        localizedSegments.push(
          createLocalizedSegment({
            id: segment.id,
            startMs: segment.startMs,
            endMs: segment.endMs,
            sourceText: segment.text,
            text: memoryHit.targetText,
            languageCode: input.targetLanguageCode,
            confidence: segment.confidence,
            speakerId: segment.speakerId,
            translationSource: TRANSLATION_SEGMENT_SOURCES.MEMORY,
          }),
        );
        this.options.repository.touchTranslationMemory(memoryHit.id);
        continue;
      }

      const glossaryResult = applyGlossaryToText(segment.text, glossaryEntries);
      if (glossaryResult.applied && glossaryResult.text !== segment.text) {
        localizedSegments.push(
          createLocalizedSegment({
            id: segment.id,
            startMs: segment.startMs,
            endMs: segment.endMs,
            sourceText: segment.text,
            text: glossaryResult.text,
            languageCode: input.targetLanguageCode,
            confidence: segment.confidence,
            speakerId: segment.speakerId,
            translationSource: TRANSLATION_SEGMENT_SOURCES.GLOSSARY,
          }),
        );
        this.options.repository.saveTranslationMemory({
          sourceLanguageCode: input.source.languageCode,
          targetLanguageCode: input.targetLanguageCode,
          sourceText: segment.text,
          targetText: glossaryResult.text,
        });
        continue;
      }

      translatorQueue.push({ segmentId: segment.id, text: segment.text });
    }

    input.onProgress(35);

    if (translatorQueue.length > 0) {
      const translated = await this.options.translator.translateSegments({
        sourceLanguageCode: input.source.languageCode,
        targetLanguageCode: input.targetLanguageCode,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        segments: translatorQueue,
        onProgress: (progress) => {
          input.onProgress(35 + Math.round(progress * 0.55));
        },
      });

      const translatedById = new Map(translated.map((item) => [item.segmentId, item.text]));

      for (const segment of input.source.segments) {
        const translatedText = translatedById.get(segment.id);
        if (translatedText === undefined) {
          continue;
        }

        localizedSegments.push(
          createLocalizedSegment({
            id: segment.id,
            startMs: segment.startMs,
            endMs: segment.endMs,
            sourceText: segment.text,
            text: translatedText,
            languageCode: input.targetLanguageCode,
            confidence: segment.confidence,
            speakerId: segment.speakerId,
            translationSource: TRANSLATION_SEGMENT_SOURCES.TRANSLATOR,
          }),
        );

        this.options.repository.saveTranslationMemory({
          sourceLanguageCode: input.source.languageCode,
          targetLanguageCode: input.targetLanguageCode,
          sourceText: segment.text,
          targetText: translatedText,
        });
      }
    }

    const orderedSegments = input.source.segments
      .map((segment) => localizedSegments.find((localized) => localized.id === segment.id))
      .filter((segment): segment is LocalizedSegment => segment !== undefined);

    const document = createLocalizedDocument({
      workflowId: input.workflowId,
      jobId: input.jobId,
      sourceLanguageCode: input.source.languageCode,
      targetLanguageCode: input.targetLanguageCode,
      sourceTranscriptId: input.source.id,
      durationMs: input.source.durationMs,
      segments: orderedSegments,
    });

    const quality = analyzeLocalizationQuality(document);
    input.onProgress(100);

    return createLocalizedDocumentAggregate({ document, quality });
  }
}

export function createLocalizationEngine(input: {
  readonly translator: TranslatorPort;
  readonly repository: LocalizationRepository;
}): LocalizationEngine {
  return new LocalizationEngine(input);
}
