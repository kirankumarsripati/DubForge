import { describe, expect, it } from 'vitest';
import { PIPELINE_VERSION } from './index';

describe('@dubforge/pipeline', () => {
  it('exports pipeline version', () => {
    expect(PIPELINE_VERSION).toBe('0.1.0');
  });
});
