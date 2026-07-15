import { describe, expect, it } from 'vitest';
import { createValidationService } from './validation-service';
import { createJobDefinition, setOutputConfiguration } from './job-definition';

describe('validation-service', () => {
  const validationService = createValidationService();

  it('reports missing video as invalid', () => {
    const result = validationService.validate(createJobDefinition());

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'video-missing')).toBe(true);
  });

  it('reports missing target languages as invalid', () => {
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
      languages: [
        { code: 'en', label: 'English', enabled: true, isSource: true },
        { code: 'hi', label: 'Hindi', enabled: false, isSource: false },
      ],
    });

    const result = validationService.validate(definition);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'targets-empty')).toBe(true);
  });

  it('reports invalid dependent output options', () => {
    const definition = setOutputConfiguration(
      createJobDefinition({
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
      }),
      {
        generateSubtitles: false,
        generateTranslatedAudio: false,
        exportTranscript: false,
        exportSrt: false,
      },
    );

    const result = validationService.validate(definition);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'output-empty')).toBe(true);
  });

  it('accepts a complete job definition', () => {
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

    const result = validationService.validate(definition);

    expect(result.valid).toBe(true);
    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0);
  });
});
