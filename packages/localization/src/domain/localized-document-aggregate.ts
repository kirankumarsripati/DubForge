import type { LocalizedDocument } from './localized-document.js';

export interface LocalizationQualityReport {
  readonly segmentCount: number;
  readonly memoryHitCount: number;
  readonly glossaryHitCount: number;
  readonly translatorHitCount: number;
  readonly emptySegmentCount: number;
  readonly timingPreserved: boolean;
  readonly score: number;
}

export interface LocalizedDocumentAggregate {
  readonly document: LocalizedDocument;
  readonly quality: LocalizationQualityReport;
}

export function createLocalizedDocumentAggregate(input: {
  readonly document: LocalizedDocument;
  readonly quality: LocalizationQualityReport;
}): LocalizedDocumentAggregate {
  return {
    document: input.document,
    quality: input.quality,
  };
}
