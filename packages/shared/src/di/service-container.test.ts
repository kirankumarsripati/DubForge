import { describe, expect, it, vi } from 'vitest';
import {
  CircularDependencyError,
  ServiceAlreadyRegisteredError,
  ServiceNotRegisteredError,
} from './errors';
import { createServiceContainer } from './service-container';
import { createToken } from './service-token';

interface Logger {
  readonly log: (message: string) => void;
}

interface Clock {
  readonly now: () => number;
}

const LOGGER_TOKEN = createToken<Logger>('Logger');
const CLOCK_TOKEN = createToken<Clock>('Clock');

describe('ServiceContainer', () => {
  it('resolves a registered singleton lazily', () => {
    const container = createServiceContainer();
    const factory = vi.fn((): Logger => ({ log: vi.fn() }));

    container.registerSingleton(LOGGER_TOKEN, factory);

    expect(factory).not.toHaveBeenCalled();

    const logger = container.resolve(LOGGER_TOKEN);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(logger.log).toBeTypeOf('function');
  });

  it('returns the same instance on subsequent resolves', () => {
    const container = createServiceContainer();
    container.registerSingleton(LOGGER_TOKEN, () => ({ log: vi.fn() }));

    const first = container.resolve(LOGGER_TOKEN);
    const second = container.resolve(LOGGER_TOKEN);

    expect(first).toBe(second);
  });

  it('reports whether a token is registered', () => {
    const container = createServiceContainer();

    expect(container.has(LOGGER_TOKEN)).toBe(false);

    container.registerSingleton(LOGGER_TOKEN, () => ({ log: vi.fn() }));

    expect(container.has(LOGGER_TOKEN)).toBe(true);
  });

  it('throws when resolving an unregistered token', () => {
    const container = createServiceContainer();

    expect(() => container.resolve(LOGGER_TOKEN)).toThrow(ServiceNotRegisteredError);
    expect(() => container.resolve(LOGGER_TOKEN)).toThrow('Service "Logger" is not registered.');
  });

  it('throws when registering the same token twice', () => {
    const container = createServiceContainer();
    container.registerSingleton(LOGGER_TOKEN, () => ({ log: vi.fn() }));

    expect(() => {
      container.registerSingleton(LOGGER_TOKEN, () => ({ log: vi.fn() }));
    }).toThrow(ServiceAlreadyRegisteredError);
    expect(() => {
      container.registerSingleton(LOGGER_TOKEN, () => ({ log: vi.fn() }));
    }).toThrow('Service "Logger" is already registered.');
  });

  it('detects circular dependencies during resolution', () => {
    const container = createServiceContainer();

    container.registerSingleton(LOGGER_TOKEN, () => {
      container.resolve(CLOCK_TOKEN);
      return { log: vi.fn() };
    });

    container.registerSingleton(CLOCK_TOKEN, () => {
      container.resolve(LOGGER_TOKEN);
      return { now: () => Date.now() };
    });

    expect(() => container.resolve(LOGGER_TOKEN)).toThrow(CircularDependencyError);
    expect(() => container.resolve(LOGGER_TOKEN)).toThrow(
      'Circular dependency detected while resolving "Logger".',
    );
  });

  it('clears registrations and cached instances', () => {
    const container = createServiceContainer();
    const factory = vi.fn((): Logger => ({ log: vi.fn() }));

    container.registerSingleton(LOGGER_TOKEN, factory);
    container.resolve(LOGGER_TOKEN);

    container.clear();

    expect(container.has(LOGGER_TOKEN)).toBe(false);
    expect(() => container.resolve(LOGGER_TOKEN)).toThrow(ServiceNotRegisteredError);

    container.registerSingleton(LOGGER_TOKEN, factory);
    container.resolve(LOGGER_TOKEN);

    expect(factory).toHaveBeenCalledTimes(2);
  });
});
