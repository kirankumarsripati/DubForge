import { PIPELINE_STAGE_CAPABILITY } from '../capabilities/pipeline-stage';
import type { PipelineStageCapabilityHandler } from '../capabilities/pipeline-stage';
import { discoverExtensions } from './discovery';
import { ExtensionLoader } from './loader';
import { ExtensionRegistry } from './registry';
import { collectHealthReports } from './loader';
import type {
  ExtensionDiscoveryResult,
  ExtensionHealthReport,
  ExtensionManifest,
  ExtensionModule,
  ExtensionRuntime,
  LoadedExtension,
  RegisteredCapability,
} from './types';

export class DefaultExtensionRuntime implements ExtensionRuntime {
  private readonly registry = new ExtensionRegistry();
  private readonly loader = new ExtensionLoader(this.registry);
  private readonly modules = new Map<string, ExtensionModule>();

  async loadBuiltin(manifest: ExtensionManifest, module: ExtensionModule): Promise<void> {
    await this.loader.load(manifest, module, 'builtin', null);
    this.modules.set(manifest.id, module);
  }

  async loadExternal(
    manifest: ExtensionManifest,
    module: ExtensionModule,
    sourcePath: string,
  ): Promise<void> {
    await this.loader.load(manifest, module, 'external', sourcePath);
    this.modules.set(manifest.id, module);
  }

  async discover(roots: readonly string[]): Promise<readonly ExtensionDiscoveryResult[]> {
    return discoverExtensions(roots);
  }

  resolveCapability(type: string, key: string): PipelineStageCapabilityHandler {
    if (type !== PIPELINE_STAGE_CAPABILITY) {
      throw new Error(`Unsupported capability type "${type}".`);
    }

    return this.registry.resolveCapability(type, key).handler;
  }

  hasCapability(type: string, key: string): boolean {
    return this.registry.hasCapability(type, key);
  }

  listExtensions(): readonly LoadedExtension[] {
    return this.registry.listExtensions();
  }

  listCapabilities(type?: string): readonly RegisteredCapability[] {
    return this.registry.listCapabilities(type);
  }

  async getHealthReports(): Promise<readonly ExtensionHealthReport[]> {
    return collectHealthReports(this.registry, this.modules);
  }
}

export function createExtensionRuntime(): ExtensionRuntime {
  return new DefaultExtensionRuntime();
}
