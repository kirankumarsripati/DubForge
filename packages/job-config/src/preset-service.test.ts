import { describe, expect, it } from 'vitest';
import { createPresetService } from './preset-service';
import { createJobDefinition } from './job-definition';

describe('preset-service', () => {
  it('lists built-in presets', () => {
    const presetService = createPresetService();
    const presets = presetService.listPresets();

    expect(presets.length).toBeGreaterThanOrEqual(3);
    expect(presets.some((preset) => preset.name === 'Hindi + Telugu')).toBe(true);
  });

  it('applies a preset to an existing definition', () => {
    const presetService = createPresetService();
    const preset = presetService.getPreset('preset-subtitles-only');

    expect(preset).not.toBeNull();
    if (preset === null) {
      return;
    }

    const applied = presetService.applyPreset(preset, createJobDefinition());

    expect(applied.output.generateTranslatedAudio).toBe(false);
    expect(applied.output.exportSrt).toBe(true);
    expect(applied.profile).toBe('fast');
  });

  it('saves and deletes custom presets', () => {
    const presetService = createPresetService();
    const saved = presetService.savePreset(createJobDefinition(), {
      name: 'My Preset',
      description: 'Custom preset for testing',
    });

    expect(presetService.getPreset(saved.id)?.name).toBe('My Preset');

    presetService.deletePreset(saved.id);
    expect(presetService.getPreset(saved.id)).toBeNull();
  });
});
