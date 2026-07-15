# Dependency Injection

Version: 1.0

Status: Locked

---

# 1. Purpose

DubForge uses a lightweight dependency injection container to wire infrastructure services in the Electron main process and pipeline layer.

Goals:

- Strong typing without reflection
- Singleton lifecycle with lazy initialization
- No external DI library
- Testable service replacement

---

# 2. Location

Package: `@dubforge/shared`

Module: `di`

---

# 3. Core Concepts

## Service Token

A token uniquely identifies a service type at compile time and runtime.

```typescript
import { createToken } from '@dubforge/shared';

interface Logger {
  readonly info: (message: string) => void;
}

export const LOGGER_TOKEN = createToken<Logger>('Logger');
```

Each call to `createToken` creates a unique symbol-backed identifier. Tokens with the same description are still distinct.

## Service Container

The container maps tokens to singleton factories and resolves instances on demand.

```typescript
import { createServiceContainer } from '@dubforge/shared';

const container = createServiceContainer();

container.registerSingleton(LOGGER_TOKEN, () => ({
  info: (message: string) => {
    // infrastructure wiring only
  },
}));

const logger = container.resolve(LOGGER_TOKEN);
```

---

# 4. Lifecycle

## Registration

`registerSingleton(token, factory)` stores a factory function.

Registration is explicit. The container does not auto-discover services.

## Resolution

`resolve(token)` returns the singleton instance.

On first resolve:

1. The factory runs
2. The result is cached
3. Subsequent resolves return the cached instance

Factories are never called more than once per token per container.

## Reset

`clear()` removes all registrations and cached instances.

Use only in tests.

---

# 5. Errors

| Error                           | When                                                                        |
| ------------------------------- | --------------------------------------------------------------------------- |
| `ServiceNotRegisteredError`     | `resolve` called for an unknown token                                       |
| `ServiceAlreadyRegisteredError` | `registerSingleton` called twice for the same token                         |
| `CircularDependencyError`       | A factory resolves a dependency that eventually resolves the original token |

---

# 6. Rules

- Register infrastructure services only
- Do not register React components
- Do not register UI state
- Do not register business logic in the renderer
- Prefer interfaces over concrete classes
- Define tokens next to the interface they identify
- Use one root container in the Electron main process
- Create fresh containers in unit tests

---

# 7. Testing

```typescript
import { createServiceContainer, createToken } from '@dubforge/shared';

const TOKEN = createToken<{ value: number }>('Counter');

const container = createServiceContainer();
container.registerSingleton(TOKEN, () => ({ value: 1 }));

expect(container.resolve(TOKEN).value).toBe(1);
```

Call `clear()` between tests when reusing a container instance.

---

# 8. Future Extension Points

The container currently supports singleton services only.

Possible future additions without breaking callers:

- Scoped containers for per-job wiring
- Factory-scoped services
- Child containers with parent fallback

Do not add these until a concrete use case requires them.
