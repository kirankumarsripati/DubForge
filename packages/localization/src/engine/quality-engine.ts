import type { LocalizedDocument } from '../domain/localized-document.js';
import type { LocalizationQualityReport } from '../domain/localized-document-aggregate.js';
import { TRANSLATION_SEGMENT_SOURCES } from '../domain/constants.js';

export function analyzeLocalizationQuality(document: LocalizedDocument): LocalizationQualityReport {
  const segmentCount = document.segments.length;
  const emptySegmentCount = document.segments.filter((segment) => segment.text.length === 0).length;
  const memoryHitCount = document.segments.filter(
    (segment) => segment.translationSource === TRANSLATION_SEGMENT_SOURCES.MEMORY,
  ).length;
  const glossaryHitCount = document.segments.filter(
    (segment) => segment.translationSource === TRANSLATION_SEGMENT_SOURCES.GLOSSARY,
  ).length;
  const translatorHitCount = document.segments.filter(
    (segment) => segment.translationSource === TRANSLATION_SEGMENT_SOURCES.TRANSLATOR,
  ).length;

  const timingPreserved = document.segments.every(
    (segment) => segment.endMs >= segment.startMs && segment.id.length > 0,
  );

  const memoryRatio = segmentCount === 0 ? 0 : memoryHitCount / segmentCount;
  const glossaryRatio = segmentCount === 0 ? 0 : glossaryHitCount / segmentCount;
  const coverageRatio =
    segmentCount === 0
      ? 0
      : document.segments.filter((segment) => segment.text.length > 0).length / segmentCount;

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        coverageRatio * 50 +
          memoryRatio * 20 +
          glossaryRatio * 10 +
          (timingPreserved ? 15 : 0) +
          (segmentCount > 0 ? 5 : 0) -
          emptySegmentCount * 10,
      ),
    ),
  );

  return {
    segmentCount,
    memoryHitCount,
    glossaryHitCount,
    translatorHitCount,
    emptySegmentCount,
    timingPreserved,
    score,
  };
}
