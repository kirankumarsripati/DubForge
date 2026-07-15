import { describe, expect, it } from 'vitest';
import { createProviderRegistry } from './registry';
import { registerFakeProviders } from './fake/register';
import { NODE_KINDS } from '@dubforge/types';

describe('ProviderRegistry', () => {
  it('registers and resolves fake providers', () => {
    const registry = createProviderRegistry();
    registerFakeProviders(registry);

    expect(registry.has(NODE_KINDS.VALIDATE)).toBe(true);
    expect(registry.has(NODE_KINDS.MANIFEST)).toBe(true);
    expect(registry.resolve(NODE_KINDS.VALIDATE)).toBeDefined();
  });
});
