import {
  CircularDependencyError,
  ServiceAlreadyRegisteredError,
  ServiceNotRegisteredError,
} from './errors';
import type { ServiceToken } from './service-token';

export type ServiceFactory<T> = () => T;

interface SingletonRegistration<T> {
  readonly kind: 'singleton';
  readonly factory: ServiceFactory<T>;
}

type Registration<T> = SingletonRegistration<T>;

export class ServiceContainer {
  private readonly instances = new Map<symbol, unknown>();
  private readonly registrations = new Map<symbol, Registration<unknown>>();
  private readonly resolving = new Set<symbol>();

  registerSingleton<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void {
    if (this.registrations.has(token.id)) {
      throw new ServiceAlreadyRegisteredError(token.description);
    }

    this.registrations.set(token.id, {
      kind: 'singleton',
      factory,
    });
  }

  has(token: ServiceToken<unknown>): boolean {
    return this.registrations.has(token.id);
  }

  resolve<T>(token: ServiceToken<T>): T {
    const cached = this.instances.get(token.id);
    if (cached !== undefined) {
      return cached as T;
    }

    const registration = this.registrations.get(token.id);
    if (registration === undefined) {
      throw new ServiceNotRegisteredError(token.description);
    }

    if (this.resolving.has(token.id)) {
      throw new CircularDependencyError(token.description);
    }

    this.resolving.add(token.id);

    try {
      const instance = (registration as SingletonRegistration<T>).factory();
      this.instances.set(token.id, instance);
      return instance;
    } finally {
      this.resolving.delete(token.id);
    }
  }

  clear(): void {
    this.instances.clear();
    this.registrations.clear();
    this.resolving.clear();
  }
}

export function createServiceContainer(): ServiceContainer {
  return new ServiceContainer();
}
