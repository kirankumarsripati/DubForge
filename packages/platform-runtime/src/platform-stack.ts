import { join } from 'node:path';

import { createDomainEventBus } from '@dubforge/platform-events';
import { createExecutionPlatform } from '@dubforge/platform-execution';
import { createArtifactPlatform } from '@dubforge/platform-artifact';
import { createObservabilityPlatform } from '@dubforge/platform-observability';
import { createResourcePlatform } from '@dubforge/platform-resource';
import { createMediaPlatform, createMediaAwareAdapterRegistry } from '@dubforge/media';
import type { ExtensionRuntime } from '@dubforge/providers';
import {
  PipelineEngine,
  deserializeWorkflowState,
  serializeWorkflowState,
  type SerializedWorkflowState,
  type WorkflowState,
} from '@dubforge/pipeline';

export interface PlatformStack {
  readonly eventBus: ReturnType<typeof createDomainEventBus>;
  readonly engine: PipelineEngine;
  readonly executionPlatform: ReturnType<typeof createExecutionPlatform>;
  readonly artifactPlatform: ReturnType<typeof createArtifactPlatform<WorkflowState>>;
  readonly mediaPlatform: ReturnType<typeof createMediaPlatform>;
  readonly observabilityPlatform: ReturnType<typeof createObservabilityPlatform>;
  readonly resourcePlatform: ReturnType<typeof createResourcePlatform>;
  dispose(): void;
}

export interface PlatformStackOptions {
  readonly rootPath: string;
  readonly maxConcurrency?: number;
  readonly ffprobePath?: string;
  readonly ffmpegPath?: string;
  readonly extensionRuntime?: ExtensionRuntime;
  readonly useFixtureMediaAdapters?: boolean;
}

export function createPlatformStack(options: PlatformStackOptions): PlatformStack {
  const eventBus = createDomainEventBus();

  const artifactPlatform = createArtifactPlatform<WorkflowState>(
    { rootPath: options.rootPath, eventBus },
    {
      serialize: (state) => JSON.stringify(serializeWorkflowState(state)),
      deserialize: (content) =>
        deserializeWorkflowState(JSON.parse(content) as SerializedWorkflowState),
      getWorkflowId: (state) => state.workflowId,
      getArtifactRoot: (state) => state.artifactRoot,
    },
  );

  const mediaPlatform = createMediaPlatform({
    rootPath: join(options.rootPath, 'media'),
    eventBus,
    artifactSink: artifactPlatform.getArtifactSink(),
    extensionRuntime: options.extensionRuntime,
    ffprobePath: options.ffprobePath,
    ffmpegPath: options.ffmpegPath,
    useFixtureAdapters: options.useFixtureMediaAdapters,
  });

  const adapterRegistry = createMediaAwareAdapterRegistry(mediaPlatform.createExecutionAdapter());

  const executionPlatform = createExecutionPlatform({
    eventBus,
    adapterRegistry,
    artifactSink: artifactPlatform.getArtifactSink(),
    defaultTimeoutMs: 300_000,
  });

  const observabilityPlatform = createObservabilityPlatform({ eventBus });
  const resourcePlatform = createResourcePlatform({ eventBus });

  const engine = new PipelineEngine({
    executor: executionPlatform.createNodeExecutionPort(),
    statePort: artifactPlatform.createWorkflowStatePort(),
    domainEventBus: eventBus,
    maxConcurrency: options.maxConcurrency,
  });

  return {
    eventBus,
    engine,
    executionPlatform,
    artifactPlatform,
    mediaPlatform,
    observabilityPlatform,
    resourcePlatform,
    dispose(): void {
      observabilityPlatform.dispose();
      mediaPlatform.close();
      artifactPlatform.close();
    },
  };
}
