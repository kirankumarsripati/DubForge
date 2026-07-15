import { describe, expect, it } from 'vitest';
import { PIPELINE_VERSION } from './index';

describe('PIPELINE_VERSION', () => {
  it('is defined', () => {
    expect(PIPELINE_VERSION).toBe('0.1.0');
  });
});
