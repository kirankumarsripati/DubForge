import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createJobDefinition, TRANSLATION_PROFILES } from '@dubforge/job-config';
import { ReviewPanel } from './ReviewPanel';

describe('ReviewPanel', () => {
  it('renders configuration summary and validation errors', () => {
    const definition = createJobDefinition();

    render(
      <ReviewPanel
        definition={definition}
        estimation={{
          processingTimeSeconds: 120,
          processingTimeLabel: '~2 min',
          qualityLabel: 'Better',
          outputSizeBytes: null,
          artifacts: ['MKV container'],
          languageTrackCount: 3,
          subtitleTrackCount: 3,
        }}
        validation={{
          valid: false,
          issues: [
            {
              code: 'video-missing',
              field: 'video',
              message: 'Select a video before starting localization.',
              severity: 'error',
            },
          ],
        }}
        isStarting={false}
        startError={null}
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByText('Select a video before starting localization.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start localization' })).toBeDisabled();
  });

  it('enables start when validation passes', () => {
    const onStart = vi.fn();
    const definition = createJobDefinition({
      video: {
        id: 'video-1',
        filename: 'demo.mp4',
        durationSeconds: 120,
        resolution: '1280×720',
        codec: 'H.264',
        audioTracks: 1,
        fileSizeBytes: 100_000_000,
        frameRate: 30,
        bitrateKbps: 2000,
        thumbnailUrl: null,
      },
    });

    const { container } = render(
      <ReviewPanel
        definition={definition}
        estimation={{
          processingTimeSeconds: 120,
          processingTimeLabel: '~2 min',
          qualityLabel: TRANSLATION_PROFILES.balanced.qualityLabel,
          outputSizeBytes: 120_000_000,
          artifacts: ['MKV container', '3 audio tracks'],
          languageTrackCount: 3,
          subtitleTrackCount: 3,
        }}
        validation={{ valid: true, issues: [] }}
        isStarting={false}
        startError={null}
        onStart={onStart}
      />,
    );

    const startButton = container.querySelector('button[aria-label="Start localization"]');
    expect(startButton).not.toBeNull();
    expect(startButton).toBeEnabled();

    if (startButton !== null) {
      fireEvent.click(startButton);
    }
    expect(onStart).toHaveBeenCalledOnce();
  });
});
