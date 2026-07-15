import { describe, expect, it } from 'vitest';
import {
  createJobDefinition,
  getTargetLanguages,
  setLanguageVoice,
  setOutputConfiguration,
  toggleLanguageSelection,
} from './job-definition';

describe('job-definition', () => {
  it('creates a definition with default languages and voices', () => {
    const definition = createJobDefinition();

    expect(definition.profile).toBe('balanced');
    expect(definition.voices.en).toBe('en-female-1');
    expect(definition.voices.hi).toBe('hi-female-1');
    expect(getTargetLanguages(definition.languages)).toHaveLength(2);
  });

  it('reconciles voices when languages are toggled', () => {
    const definition = toggleLanguageSelection(createJobDefinition(), 'ta');

    expect(definition.languages.find((language) => language.code === 'ta')?.enabled).toBe(true);
    expect(definition.voices.ta).toBe('ta-female-1');
  });

  it('normalizes dependent output options', () => {
    const definition = setOutputConfiguration(createJobDefinition(), {
      generateSubtitles: false,
      embedSubtitles: true,
      exportSrt: true,
    });

    expect(definition.output.embedSubtitles).toBe(false);
    expect(definition.output.exportSrt).toBe(false);
  });

  it('updates a selected voice for a language', () => {
    const definition = setLanguageVoice(createJobDefinition(), 'hi', 'hi-male-1');

    expect(definition.voices.hi).toBe('hi-male-1');
  });

  it('includes video metadata when provided', () => {
    const definition = createJobDefinition({
      video: {
        id: 'video-1',
        filename: 'morning-yoga-flow.mp4',
        durationSeconds: 3720,
        resolution: '1920×1080',
        codec: 'H.264',
        audioTracks: 1,
        fileSizeBytes: 1_458_000_000,
        frameRate: 29.97,
        bitrateKbps: 3200,
        thumbnailUrl: null,
      },
    });

    expect(definition.video?.filename).toBe('morning-yoga-flow.mp4');
  });
});
