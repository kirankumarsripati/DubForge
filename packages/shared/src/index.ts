export function createAppId(): string {
  return crypto.randomUUID();
}

export {
  CircularDependencyError,
  createServiceContainer,
  createToken,
  ServiceAlreadyRegisteredError,
  ServiceContainer,
  ServiceNotRegisteredError,
  type ServiceFactory,
  type ServiceToken,
} from './di';
