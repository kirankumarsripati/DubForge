import { describe, expect, it } from 'vitest';
import { createToken } from './service-token';

describe('createToken', () => {
  it('creates a token with the given description', () => {
    const token = createToken<string>('Logger');

    expect(token.description).toBe('Logger');
    expect(typeof token.id).toBe('symbol');
  });

  it('creates unique tokens for the same description', () => {
    const first = createToken<string>('Logger');
    const second = createToken<string>('Logger');

    expect(first.id).not.toBe(second.id);
  });
});
