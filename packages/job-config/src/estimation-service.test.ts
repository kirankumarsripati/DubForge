import { describe, expect, it } from 'vitest';
import { createEstimationService } from './estimation-service';
import { createJobDefinition } from './job-definition';

describe('estimation-service', () => {
  const estimationService = createEstimationService();

  it('returns a longer estimate for studio profile than fast profile', () => {
    const baseDefinition = createJobDefinition({
      video: {
        id: 'video-1',
        filename: 'demo.mp4',
        durationSeconds: 3600,
        resolution: '1920×1080',
        codec: 'H.264',
        audioTracks: 1,
        fileSizeBytes: 1_000_000_000,
        frameRate: 30,
        bitrateKbps: 4000,
        thumbnailUrl: null,
      },
    });

    const fastEstimate = estimationService.estimate({
      ...baseDefinition,
      profile: 'fast',
    });
    const studioEstimate = estimationService.estimate({
      ...baseDefinition,
      profile: 'studio',
    });

    expect(studioEstimate.processingTimeSeconds).toBeGreaterThan(
      fastEstimate.processingTimeSeconds,
    );
    expect(studioEstimate.qualityLabel).toBe('Best');
    expect(fastEstimate.qualityLabel).toBe('Good');
  });

  it('includes subtitle tracks when subtitle generation is enabled', () => {
    const estimate = estimationService.estimate(createJobDefinition());

    expect(estimate.subtitleTrackCount).toBeGreaterThan(0);
    expect(estimate.artifacts.some((artifact) => artifact.includes('subtitle'))).toBe(true);
  });

  it('returns a minimum estimate when no video is selected', () => {
    const estimate = estimationService.estimate(createJobDefinition());

    expect(estimate.processingTimeSeconds).toBeGreaterThanOrEqual(30);
    expect(estimate.outputSizeBytes).toBeNull();
  });
});
