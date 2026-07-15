import { ExtensionRegistry } from './registry';
import { checkRuntimeCompatibility } from './version';
import { validateParsedManifest } from './manifest';
import type {
  ExtensionActivationContext,
  ExtensionHealthReport,
  ExtensionHealthStatus,
  ExtensionKind,
  ExtensionManifest,
  ExtensionModule,
  LoadedExtension,
} from './types';

export class ExtensionLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtensionLoadError';
  }
}

function createActivationContext(
  manifest: ExtensionManifest,
  extensionId: string,
  registry: ExtensionRegistry,
): ExtensionActivationContext {
  return {
    manifest,
    registerCapability(declaration, handler) {
      registry.registerCapability(extensionId, declaration, handler);
    },
  };
}

export class ExtensionLoader {
  constructor(private readonly registry: ExtensionRegistry) {}

  async load(
    manifest: ExtensionManifest,
    module: ExtensionModule,
    kind: ExtensionKind,
    sourcePath: string | null,
  ): Promise<LoadedExtension> {
    const validation = validateParsedManifest(manifest);
    if (!validation.valid) {
      const firstIssue = validation.issues[0];
      throw new ExtensionLoadError(firstIssue?.message ?? 'Invalid extension manifest.');
    }

    const compatibility = checkRuntimeCompatibility(manifest.runtimeVersion);
    if (!compatibility.compatible) {
      throw new ExtensionLoadError(
        compatibility.reason ?? 'Extension is incompatible with the current runtime.',
      );
    }

    const loadedExtension: LoadedExtension = {
      manifest,
      kind,
      sourcePath,
      loadedAt: new Date().toISOString(),
      capabilities: [...manifest.capabilities],
    };

    this.registry.registerExtension(loadedExtension);

    const context = createActivationContext(manifest, manifest.id, this.registry);
    await module.activate(context);

    return loadedExtension;
  }
}

export async function collectHealthReports(
  registry: ExtensionRegistry,
  modules: ReadonlyMap<string, ExtensionModule>,
): Promise<readonly ExtensionHealthReport[]> {
  const reports: ExtensionHealthReport[] = [];
  const checkedAt = new Date().toISOString();

  for (const extension of registry.listExtensions()) {
    const module = modules.get(extension.manifest.id);
    let status: ExtensionHealthStatus = 'healthy';
    let message: string | null = null;

    if (module?.healthCheck !== undefined) {
      status = await module.healthCheck();
      if (status !== 'healthy') {
        message = `Extension reported ${status} health.`;
      }
    }

    const declaredCapabilities = extension.capabilities.length;
    const registeredCapabilities = registry
      .listCapabilities()
      .filter((capability) => capability.extensionId === extension.manifest.id).length;

    if (registeredCapabilities < declaredCapabilities) {
      status = 'degraded';
      message = `Registered ${String(registeredCapabilities)} of ${String(declaredCapabilities)} declared capabilities.`;
    }

    reports.push({
      extensionId: extension.manifest.id,
      extensionName: extension.manifest.name,
      status,
      message,
      checkedAt,
    });
  }

  return reports;
}
