import type { CanonicalTranscript } from '../domain/canonical-transcript.js';
import type { TranscriptQualityReport } from '../domain/transcript-aggregate.js';

export function analyzeTranscriptQuality(transcript: CanonicalTranscript): TranscriptQualityReport {
  const segmentCount = transcript.segments.length;
  const emptySegmentCount = transcript.segments.filter(
    (segment) => segment.text.length === 0,
  ).length;
  const confidences = transcript.segments
    .map((segment) => segment.confidence)
    .filter((confidence): confidence is number => confidence !== null);

  const averageConfidence =
    confidences.length === 0
      ? 0
      : confidences.reduce((total, value) => total + value, 0) / confidences.length;

  let overlapCount = 0;
  for (let index = 1; index < transcript.segments.length; index += 1) {
    const previous = transcript.segments[index - 1];
    const current = transcript.segments[index];
    if (previous !== undefined && current !== undefined && current.startMs < previous.endMs) {
      overlapCount += 1;
    }
  }

  const coverageRatio =
    transcript.durationMs === 0
      ? 0
      : transcript.segments.reduce(
          (total, segment) => total + Math.max(0, segment.endMs - segment.startMs),
          0,
        ) / transcript.durationMs;

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        averageConfidence * 70 +
          coverageRatio * 20 +
          (segmentCount > 0 ? 10 : 0) -
          emptySegmentCount * 5 -
          overlapCount * 3,
      ),
    ),
  );

  return {
    averageConfidence,
    segmentCount,
    emptySegmentCount,
    overlapCount,
    score,
  };
}
