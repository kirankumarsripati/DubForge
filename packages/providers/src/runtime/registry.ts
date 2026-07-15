import type {
  ExtensionCapabilityDeclaration,
  LoadedExtension,
  RegisteredCapability,
} from './types';

export class CapabilityNotFoundError extends Error {
  constructor(type: string, key: string) {
    super(`No capability registered for type "${type}" with key "${key}".`);
    this.name = 'CapabilityNotFoundError';
  }
}

export class ExtensionAlreadyRegisteredError extends Error {
  constructor(extensionId: string) {
    super(`Extension "${extensionId}" is already registered.`);
    this.name = 'ExtensionAlreadyRegisteredError';
  }
}

export class ExtensionRegistry {
  private readonly extensions = new Map<string, LoadedExtension>();
  private readonly capabilities = new Map<string, RegisteredCapability>();

  registerExtension(extension: LoadedExtension): void {
    if (this.extensions.has(extension.manifest.id)) {
      throw new ExtensionAlreadyRegisteredError(extension.manifest.id);
    }
    this.extensions.set(extension.manifest.id, extension);
  }

  registerCapability(
    extensionId: string,
    declaration: ExtensionCapabilityDeclaration,
    handler: RegisteredCapability['handler'],
  ): void {
    const capabilityKey = createCapabilityKey(declaration.type, declaration.key);
    this.capabilities.set(capabilityKey, {
      declaration,
      extensionId,
      handler,
    });
  }

  resolveCapability(type: string, key: string): RegisteredCapability {
    const capability = this.capabilities.get(createCapabilityKey(type, key));
    if (capability === undefined) {
      throw new CapabilityNotFoundError(type, key);
    }
    return capability;
  }

  hasCapability(type: string, key: string): boolean {
    return this.capabilities.has(createCapabilityKey(type, key));
  }

  listExtensions(): readonly LoadedExtension[] {
    return [...this.extensions.values()];
  }

  listCapabilities(type?: string): readonly RegisteredCapability[] {
    const capabilities = [...this.capabilities.values()];
    if (type === undefined) {
      return capabilities;
    }
    return capabilities.filter((capability) => capability.declaration.type === type);
  }

  getExtension(extensionId: string): LoadedExtension | null {
    return this.extensions.get(extensionId) ?? null;
  }
}

export function createCapabilityKey(type: string, key: string): string {
  return `${type}::${key}`;
}
