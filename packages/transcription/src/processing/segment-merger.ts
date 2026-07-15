import type { CanonicalSegment } from '../domain/canonical-transcript.js';
import { normalizeSegmentText } from './normalization.js';

const DEFAULT_MERGE_GAP_MS = 250;

export function mergeAdjacentSegments(
  segments: readonly CanonicalSegment[],
  maxGapMs: number = DEFAULT_MERGE_GAP_MS,
): readonly CanonicalSegment[] {
  const firstSegment = segments[0];
  if (firstSegment === undefined) {
    return segments;
  }

  const merged: CanonicalSegment[] = [];
  let current: CanonicalSegment = { ...firstSegment };

  for (const segment of segments.slice(1)) {
    const gapMs = segment.startMs - current.endMs;
    const sameSpeaker = current.speakerId === segment.speakerId;
    const sameLanguage = current.languageCode === segment.languageCode;

    if (gapMs <= maxGapMs && sameSpeaker && sameLanguage) {
      current = {
        ...current,
        endMs: Math.max(current.endMs, segment.endMs),
        text: normalizeSegmentText(`${current.text} ${segment.text}`),
        confidence:
          current.confidence !== null && segment.confidence !== null
            ? (current.confidence + segment.confidence) / 2
            : (current.confidence ?? segment.confidence),
      };
      continue;
    }

    merged.push(current);
    current = { ...segment };
  }

  merged.push(current);
  return merged;
}
