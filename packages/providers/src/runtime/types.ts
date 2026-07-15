import type { PipelineStageCapabilityHandler } from '../capabilities/pipeline-stage';

export const EXTENSION_KINDS = {
  BUILTIN: 'builtin',
  EXTERNAL: 'external',
} as const;

export type ExtensionKind = (typeof EXTENSION_KINDS)[keyof typeof EXTENSION_KINDS];

export const EXTENSION_HEALTH_STATUSES = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
} as const;

export type ExtensionHealthStatus =
  (typeof EXTENSION_HEALTH_STATUSES)[keyof typeof EXTENSION_HEALTH_STATUSES];

export interface ExtensionCapabilityDeclaration {
  readonly id: string;
  readonly type: string;
  readonly key: string;
}

export interface ExtensionManifest {
  readonly manifestVersion: string;
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly runtimeVersion: string;
  readonly kind: ExtensionKind;
  readonly capabilities: readonly ExtensionCapabilityDeclaration[];
  readonly entry?: string;
}

export interface ExtensionActivationContext {
  readonly manifest: ExtensionManifest;
  registerCapability(
    declaration: ExtensionCapabilityDeclaration,
    handler: PipelineStageCapabilityHandler,
  ): void;
}

export interface ExtensionModule {
  activate(context: ExtensionActivationContext): Promise<void>;
  deactivate?(): Promise<void>;
  healthCheck?(): Promise<ExtensionHealthStatus>;
}

export interface LoadedExtension {
  readonly manifest: ExtensionManifest;
  readonly kind: ExtensionKind;
  readonly sourcePath: string | null;
  readonly loadedAt: string;
  readonly capabilities: readonly ExtensionCapabilityDeclaration[];
}

export interface RegisteredCapability {
  readonly declaration: ExtensionCapabilityDeclaration;
  readonly extensionId: string;
  readonly handler: PipelineStageCapabilityHandler;
}

export interface ExtensionHealthReport {
  readonly extensionId: string;
  readonly extensionName: string;
  readonly status: ExtensionHealthStatus;
  readonly message: string | null;
  readonly checkedAt: string;
}

export interface ExtensionDiscoveryResult {
  readonly manifest: ExtensionManifest;
  readonly sourcePath: string;
}

export interface ExtensionRuntime {
  loadBuiltin(manifest: ExtensionManifest, module: ExtensionModule): Promise<void>;
  loadExternal(
    manifest: ExtensionManifest,
    module: ExtensionModule,
    sourcePath: string,
  ): Promise<void>;
  discover(roots: readonly string[]): Promise<readonly ExtensionDiscoveryResult[]>;
  resolveCapability(type: string, key: string): PipelineStageCapabilityHandler;
  hasCapability(type: string, key: string): boolean;
  listExtensions(): readonly LoadedExtension[];
  listCapabilities(type?: string): readonly RegisteredCapability[];
  getHealthReports(): Promise<readonly ExtensionHealthReport[]>;
}

export interface ExtensionValidationIssue {
  readonly code: string;
  readonly field: string;
  readonly message: string;
}

export interface ExtensionValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ExtensionValidationIssue[];
}
