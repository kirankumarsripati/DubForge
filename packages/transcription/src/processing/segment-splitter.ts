import { randomUUID } from 'node:crypto';

import type { CanonicalSegment } from '../domain/canonical-transcript.js';
import { normalizeSegmentText } from './normalization.js';

const DEFAULT_MAX_SEGMENT_MS = 7000;

function splitTextEvenly(text: string, parts: number): readonly string[] {
  const words = text.split(' ');
  if (parts <= 1 || words.length <= parts) {
    return [text];
  }

  const chunkSize = Math.ceil(words.length / parts);
  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += chunkSize) {
    chunks.push(words.slice(index, index + chunkSize).join(' '));
  }

  return chunks;
}

export function splitLongSegments(
  segments: readonly CanonicalSegment[],
  maxDurationMs: number = DEFAULT_MAX_SEGMENT_MS,
): readonly CanonicalSegment[] {
  const result: CanonicalSegment[] = [];

  for (const segment of segments) {
    const durationMs = segment.endMs - segment.startMs;
    if (durationMs <= maxDurationMs) {
      result.push(segment);
      continue;
    }

    const parts = Math.ceil(durationMs / maxDurationMs);
    const partDurationMs = Math.floor(durationMs / parts);
    const textParts = splitTextEvenly(segment.text, parts);

    for (let index = 0; index < parts; index += 1) {
      const startMs = segment.startMs + index * partDurationMs;
      const endMs = index === parts - 1 ? segment.endMs : startMs + partDurationMs;
      const text = normalizeSegmentText(textParts[index] ?? '');

      if (text.length === 0) {
        continue;
      }

      result.push({
        id: randomUUID(),
        startMs,
        endMs,
        text,
        languageCode: segment.languageCode,
        confidence: segment.confidence,
        speakerId: segment.speakerId,
      });
    }
  }

  return result;
}
