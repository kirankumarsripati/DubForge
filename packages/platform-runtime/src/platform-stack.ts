import { createDomainEventBus, type DomainEventBus } from '@dubforge/platform-events';
import { createExecutionPlatform } from '@dubforge/platform-execution';
import { createDefaultAdapterRegistry } from '@dubforge/platform-execution-adapters';
import { createArtifactPlatform } from '@dubforge/platform-artifact';
import { createObservabilityPlatform } from '@dubforge/platform-observability';
import { createResourcePlatform } from '@dubforge/platform-resource';
import {
  PipelineEngine,
  deserializeWorkflowState,
  serializeWorkflowState,
  type SerializedWorkflowState,
  type WorkflowState,
} from '@dubforge/pipeline';

export interface PlatformStack {
  readonly eventBus: DomainEventBus;
  readonly engine: PipelineEngine;
  readonly executionPlatform: ReturnType<typeof createExecutionPlatform>;
  readonly artifactPlatform: ReturnType<typeof createArtifactPlatform<WorkflowState>>;
  readonly observabilityPlatform: ReturnType<typeof createObservabilityPlatform>;
  readonly resourcePlatform: ReturnType<typeof createResourcePlatform>;
  dispose(): void;
}

export interface PlatformStackOptions {
  readonly rootPath: string;
  readonly maxConcurrency?: number;
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

  const executionPlatform = createExecutionPlatform({
    eventBus,
    adapterRegistry: createDefaultAdapterRegistry(),
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
    observabilityPlatform,
    resourcePlatform,
    dispose(): void {
      observabilityPlatform.dispose();
      artifactPlatform.close();
    },
  };
}
