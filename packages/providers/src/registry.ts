import type { NodeKind } from '@dubforge/types';
import type { ProviderRegistry, StageProvider } from './types';

export class ProviderNotFoundError extends Error {
  constructor(kind: NodeKind) {
    super(`No provider registered for node kind "${kind}".`);
    this.name = 'ProviderNotFoundError';
  }
}

export class DefaultProviderRegistry implements ProviderRegistry {
  private readonly providers = new Map<NodeKind, StageProvider>();

  register(kind: NodeKind, provider: StageProvider): void {
    this.providers.set(kind, provider);
  }

  resolve(kind: NodeKind): StageProvider {
    const provider = this.providers.get(kind);
    if (provider === undefined) {
      throw new ProviderNotFoundError(kind);
    }
    return provider;
  }

  has(kind: NodeKind): boolean {
    return this.providers.has(kind);
  }
}

export function createProviderRegistry(): ProviderRegistry {
  return new DefaultProviderRegistry();
}
