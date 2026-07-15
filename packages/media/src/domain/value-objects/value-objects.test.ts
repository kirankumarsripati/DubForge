import { describe, expect, it } from 'vitest';

import { createDuration } from '../../domain/value-objects/duration.js';
import { createResolution, resolutionLabel } from '../../domain/value-objects/resolution.js';
import { normalizeCodecName } from '../../domain/value-objects/codec.js';
import { isMediaNodeKind } from '../../integration/media-execution-adapter.js';

describe('Media value objects', () => {
  it('creates duration and resolution value objects', () => {
    expect(createDuration(12.5).seconds).toBe(12.5);
    expect(resolutionLabel(createResolution(1920, 1080))).toBe('1080p');
  });

  it('normalizes codec names', () => {
    expect(normalizeCodecName('h264')).toBe('H.264');
    expect(normalizeCodecName('aac')).toBe('AAC');
  });

  it('identifies media node kinds', () => {
    expect(isMediaNodeKind('metadata')).toBe(true);
    expect(isMediaNodeKind('translate')).toBe(false);
  });
});
