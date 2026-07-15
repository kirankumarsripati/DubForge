import type { CanonicalTranscript } from '../domain/canonical-transcript.js';
import {
  createTranscriptAggregate,
  type TranscriptAggregate,
} from '../domain/transcript-aggregate.js';
import { richTextFromSegments } from '../domain/rich-text.js';
import { mergeAdjacentSegments } from './segment-merger.js';
import { splitLongSegments } from './segment-splitter.js';
import { NORMALIZATION_VERSION, normalizeCanonicalTranscript } from './normalization.js';
import { analyzeTranscriptQuality } from './quality-analyzer.js';

export class TranscriptProcessingPlatform {
  process(transcript: CanonicalTranscript): TranscriptAggregate {
    const normalized = normalizeCanonicalTranscript(transcript);
    const merged = {
      ...normalized,
      segments: mergeAdjacentSegments(normalized.segments),
    };
    const split = {
      ...merged,
      segments: splitLongSegments(merged.segments),
    };
    const finalTranscript = normalizeCanonicalTranscript(split);
    const quality = analyzeTranscriptQuality(finalTranscript);

    return createTranscriptAggregate({
      transcript: finalTranscript,
      richText: richTextFromSegments(finalTranscript.segments),
      quality,
      normalizationVersion: NORMALIZATION_VERSION,
    });
  }
}

export function createTranscriptProcessingPlatform(): TranscriptProcessingPlatform {
  return new TranscriptProcessingPlatform();
}
