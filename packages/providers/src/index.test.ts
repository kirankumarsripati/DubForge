import { describe, expect, it } from 'vitest';
import { PROVIDERS_VERSION } from './index';

describe('PROVIDERS_VERSION', () => {
  it('is defined', () => {
    expect(PROVIDERS_VERSION).toBe('0.1.0');
  });
});
