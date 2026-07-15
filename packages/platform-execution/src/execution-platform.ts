import {
  createDomainEventId,
  EXECUTION_EVENTS,
  type DomainEventBus,
} from '@dubforge/platform-events';
import {
  type ExecutionAdapterRegistry,
  type ArtifactSink,
} from '@dubforge/platform-execution-adapters';

import { createTimeoutSignal, ProcessManager } from './process-manager.js';
import type { NodeExecutionPort, NodeExecutionRequest, NodeExecutionResult } from './types.js';
import { EXECUTION_STATUSES } from './types.js';

export interface ExecutionPlatformOptions {
  readonly eventBus: DomainEventBus;
  readonly adapterRegistry: ExecutionAdapterRegistry;
  readonly artifactSink?: ArtifactSink;
  readonly defaultTimeoutMs?: number;
}

export class ExecutionPlatform {
  private readonly processManager = new ProcessManager();
  private readonly defaultTimeoutMs: number;

  constructor(private readonly options: ExecutionPlatformOptions) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 300_000;
  }

  createNodeExecutionPort(): NodeExecutionPort {
    return {
      execute: (request) => this.executeNode(request),
    };
  }

  cancelAll(): void {
    this.processManager.cancelAll();
  }

  getActiveExecutions() {
    return this.processManager.getActiveExecutions();
  }

  private async executeNode(request: NodeExecutionRequest): Promise<NodeExecutionResult> {
    const executionId = this.processManager.createExecutionId();
    const adapter = this.options.adapterRegistry.resolve({
      executionId,
      workflowId: request.workflowId,
      jobId: request.jobId,
      nodeId: request.nodeId,
      nodeKind: request.nodeKind,
      languageCode: request.languageCode,
      videoPath: request.videoPath,
      videoFilename: request.videoFilename,
      durationSeconds: request.durationSeconds,
      profile: request.profile,
      output: request.output,
      outputDirectory: request.outputDirectory,
      artifactRoot: request.artifactRoot,
      artifacts: request.artifacts,
      artifactSink: this.options.artifactSink,
      signal: request.signal,
      onProgress: request.onProgress,
    });

    const signal = this.processManager.register(
      executionId,
      request.workflowId,
      request.jobId,
      request.nodeId,
      adapter.kind,
      this.defaultTimeoutMs,
      request.signal,
    );

    const timeout = createTimeoutSignal(this.defaultTimeoutMs, signal);
    const timestamp = new Date().toISOString();

    this.publishExecutionEvent(EXECUTION_EVENTS.REQUESTED, request, adapter.kind, timestamp);
    this.publishExecutionEvent(EXECUTION_EVENTS.STARTED, request, adapter.kind, timestamp);

    try {
      const result = await adapter.execute({
        executionId,
        workflowId: request.workflowId,
        jobId: request.jobId,
        nodeId: request.nodeId,
        nodeKind: request.nodeKind,
        languageCode: request.languageCode,
        videoPath: request.videoPath,
        videoFilename: request.videoFilename,
        durationSeconds: request.durationSeconds,
        profile: request.profile,
        output: request.output,
        outputDirectory: request.outputDirectory,
        artifactRoot: request.artifactRoot,
        artifacts: request.artifacts,
        artifactSink: this.options.artifactSink,
        signal: timeout.signal,
        onProgress: (progress: number) => {
          this.options.eventBus.publish({
            id: createDomainEventId(),
            type: EXECUTION_EVENTS.PROGRESS,
            timestamp: new Date().toISOString(),
            workflowId: request.workflowId,
            jobId: request.jobId,
            nodeId: request.nodeId,
            progress,
          });
          request.onProgress(progress);
        },
      });

      timeout.clear();

      if (timeout.signal.aborted) {
        throw new Error('Execution timed out');
      }

      this.processManager.complete(executionId, EXECUTION_STATUSES.COMPLETED);
      this.options.eventBus.publish({
        id: createDomainEventId(),
        type: EXECUTION_EVENTS.COMPLETED,
        timestamp: new Date().toISOString(),
        workflowId: request.workflowId,
        jobId: request.jobId,
        nodeId: request.nodeId,
        adapterKind: adapter.kind,
        artifacts: result.artifacts,
      });

      return result;
    } catch (error) {
      timeout.clear();
      const message = error instanceof Error ? error.message : 'Execution failed';
      const failedAt = new Date().toISOString();
      const eventType =
        message === 'Execution timed out'
          ? EXECUTION_EVENTS.TIMED_OUT
          : message === 'Execution cancelled'
            ? EXECUTION_EVENTS.CANCELLED
            : EXECUTION_EVENTS.FAILED;

      this.processManager.complete(
        executionId,
        eventType === EXECUTION_EVENTS.TIMED_OUT
          ? EXECUTION_STATUSES.TIMED_OUT
          : eventType === EXECUTION_EVENTS.CANCELLED
            ? EXECUTION_STATUSES.CANCELLED
            : EXECUTION_STATUSES.FAILED,
      );

      this.options.eventBus.publish({
        id: createDomainEventId(),
        type: eventType,
        timestamp: failedAt,
        workflowId: request.workflowId,
        jobId: request.jobId,
        nodeId: request.nodeId,
        adapterKind: adapter.kind,
      });

      throw error;
    }
  }

  private publishExecutionEvent(
    type:
      | typeof EXECUTION_EVENTS.REQUESTED
      | typeof EXECUTION_EVENTS.STARTED
      | typeof EXECUTION_EVENTS.COMPLETED,
    request: NodeExecutionRequest,
    adapterKind: string,
    timestamp: string,
  ): void {
    this.options.eventBus.publish({
      id: createDomainEventId(),
      type,
      timestamp,
      workflowId: request.workflowId,
      jobId: request.jobId,
      nodeId: request.nodeId,
      adapterKind,
    });
  }
}

export function createExecutionPlatform(options: ExecutionPlatformOptions): ExecutionPlatform {
  return new ExecutionPlatform(options);
}
