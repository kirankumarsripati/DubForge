export class ServiceNotRegisteredError extends Error {
  constructor(description: string) {
    super(`Service "${description}" is not registered.`);
    this.name = 'ServiceNotRegisteredError';
  }
}

export class ServiceAlreadyRegisteredError extends Error {
  constructor(description: string) {
    super(`Service "${description}" is already registered.`);
    this.name = 'ServiceAlreadyRegisteredError';
  }
}

export class CircularDependencyError extends Error {
  constructor(description: string) {
    super(`Circular dependency detected while resolving "${description}".`);
    this.name = 'CircularDependencyError';
  }
}
