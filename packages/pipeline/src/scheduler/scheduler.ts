import type { OutputConfiguration } from '@dubforge/job-config';
import { WORKFLOW_EVENTS, type DomainEventBus } from '@dubforge/platform-events';
import type { TranslationProfile } from '@dubforge/types';
import { DEFAULT_MAX_CONCURRENCY, MAX_NODE_RETRIES, RETRY_BASE_DELAY_MS } from '../constants';
import type { DagNode, NodeExecutionState, NodeId, WorkflowState } from '../dag/types';
import { NODE_STATUSES, WORKFLOW_STATUSES } from '../dag/types';
import {
  publishWorkflowLifecycleEvent,
  publishWorkflowNodeEvent,
  publishWorkflowNodeProgress,
  publishWorkflowStateChanged,
} from '../events/domain-events';
import type { WorkflowEventBus } from '../events/event-bus';
import { WORKFLOW_EVENT_TYPES } from '../events/event-bus';
import type { NodeExecutionPort } from '../ports/node-execution-port';
import type { WorkflowStatePort } from '../ports/workflow-state-port';

export interface SchedulerInput {
  readonly workflowId: string;
  readonly jobId: string;
  readonly videoPath: string;
  readonly videoFilename: string;
  readonly durationSeconds: number;
  readonly profile: TranslationProfile;
  readonly output: OutputConfiguration;
  readonly outputDirectory: string;
}

export interface SchedulerOptions {
  readonly maxConcurrency?: number;
  readonly maxRetries?: number;
  readonly retryBaseDelayMs?: number;
  readonly domainEventBus?: DomainEventBus;
}

interface NodeCompletion {
  readonly nodeId: NodeId;
  readonly state: WorkflowState;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function collectArtifacts(state: WorkflowState): Record<string, string> {
  const artifacts: Record<string, string> = {};

  for (const nodeState of state.nodeStates.values()) {
    for (const [artifactKey, artifactPath] of Object.entries(nodeState.artifacts)) {
      artifacts[artifactKey] = artifactPath;
    }
  }

  return artifacts;
}

function updateNodeState(
  state: WorkflowState,
  nodeId: NodeId,
  patch: Partial<NodeExecutionState>,
): WorkflowState {
  const current = state.nodeStates.get(nodeId);
  if (current === undefined) {
    return state;
  }

  const nextNodeStates = new Map(state.nodeStates);
  nextNodeStates.set(nodeId, { ...current, ...patch });

  return {
    ...state,
    nodeStates: nextNodeStates,
    updatedAt: new Date().toISOString(),
  };
}

function getCompletedNodeIds(state: WorkflowState): Set<NodeId> {
  const completed = new Set<NodeId>();

  for (const [nodeId, nodeState] of state.nodeStates.entries()) {
    if (nodeState.status === NODE_STATUSES.COMPLETED) {
      completed.add(nodeId);
    }
  }

  return completed;
}

function getPendingReadyNodes(state: WorkflowState): DagNode[] {
  const completed = getCompletedNodeIds(state);
  const ready: DagNode[] = [];

  for (const node of state.graph.nodes.values()) {
    const nodeState = state.nodeStates.get(node.id);
    if (nodeState?.status !== NODE_STATUSES.PENDING) {
      continue;
    }

    const dependenciesMet = node.dependencies.every((dependencyId) => completed.has(dependencyId));
    if (dependenciesMet) {
      ready.push(node);
    }
  }

  return ready.sort((left, right) => left.layer - right.layer || left.id.localeCompare(right.id));
}

function isWorkflowFinished(state: WorkflowState): boolean {
  for (const nodeState of state.nodeStates.values()) {
    if (
      nodeState.status === NODE_STATUSES.PENDING ||
      nodeState.status === NODE_STATUSES.QUEUED ||
      nodeState.status === NODE_STATUSES.RUNNING
    ) {
      return false;
    }
  }
  return true;
}

function finalizeWorkflowStatus(state: WorkflowState): WorkflowState {
  const hasFailure = [...state.nodeStates.values()].some(
    (nodeState) => nodeState.status === NODE_STATUSES.FAILED,
  );

  if (hasFailure) {
    return { ...state, status: WORKFLOW_STATUSES.FAILED, updatedAt: new Date().toISOString() };
  }

  return { ...state, status: WORKFLOW_STATUSES.COMPLETED, updatedAt: new Date().toISOString() };
}

export class Scheduler {
  private readonly maxConcurrency: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly domainEventBus?: DomainEventBus;
  private readonly abortController = new AbortController();

  constructor(
    private readonly eventBus: WorkflowEventBus,
    private readonly statePort: WorkflowStatePort,
    options: SchedulerOptions = {},
  ) {
    this.maxConcurrency = options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
    this.maxRetries = options.maxRetries ?? MAX_NODE_RETRIES;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? RETRY_BASE_DELAY_MS;
    this.domainEventBus = options.domainEventBus;
  }

  cancel(): void {
    this.abortController.abort();
  }

  async execute(
    initialState: WorkflowState,
    executor: NodeExecutionPort,
    input: SchedulerInput,
  ): Promise<WorkflowState> {
    let state: WorkflowState = {
      ...initialState,
      status: WORKFLOW_STATUSES.RUNNING,
      updatedAt: new Date().toISOString(),
    };

    await this.persistState(state);
    this.publishWorkflowEvent(WORKFLOW_EVENT_TYPES.WORKFLOW_STARTED, state);
    this.publishDomainWorkflowEvent(WORKFLOW_EVENTS.STARTED, state);

    const readyQueue: NodeId[] = getPendingReadyNodes(state).map((node) => node.id);
    const inFlight = new Map<NodeId, Promise<NodeCompletion>>();

    while (
      state.status === WORKFLOW_STATUSES.RUNNING &&
      (readyQueue.length > 0 || inFlight.size > 0)
    ) {
      while (
        readyQueue.length > 0 &&
        inFlight.size < this.maxConcurrency &&
        state.status === WORKFLOW_STATUSES.RUNNING
      ) {
        const nodeId = readyQueue.shift();
        if (nodeId === undefined) {
          break;
        }

        const node = state.graph.nodes.get(nodeId);
        const nodeState = state.nodeStates.get(nodeId);
        if (node === undefined || nodeState?.status !== NODE_STATUSES.PENDING) {
          continue;
        }

        state = updateNodeState(state, nodeId, { status: NODE_STATUSES.QUEUED });
        await this.persistState(state);
        this.publishNodeEvent(WORKFLOW_EVENT_TYPES.NODE_QUEUED, state, nodeId);
        this.publishDomainNodeEvent(WORKFLOW_EVENTS.NODE_QUEUED, state, nodeId);

        const completion = this.runNode(state, node, executor, input).then((nextState) => ({
          nodeId,
          state: nextState,
        }));

        inFlight.set(nodeId, completion);
      }

      if (inFlight.size === 0) {
        if (readyQueue.length === 0) {
          break;
        }
        continue;
      }

      const completion = await Promise.race(inFlight.values());
      inFlight.delete(completion.nodeId);
      state = completion.state;

      if (this.abortController.signal.aborted) {
        state = {
          ...state,
          status: WORKFLOW_STATUSES.CANCELLED,
          updatedAt: new Date().toISOString(),
        };
        await this.persistState(state);
        this.publishWorkflowEvent(WORKFLOW_EVENT_TYPES.WORKFLOW_CANCELLED, state);
        this.publishDomainWorkflowEvent(WORKFLOW_EVENTS.CANCELLED, state);
        return state;
      }

      const completedNodeState = state.nodeStates.get(completion.nodeId);
      if (completedNodeState?.status === NODE_STATUSES.COMPLETED) {
        const nextReady = getPendingReadyNodes(state).map((node) => node.id);
        for (const nextNodeId of nextReady) {
          if (!readyQueue.includes(nextNodeId) && !inFlight.has(nextNodeId)) {
            readyQueue.push(nextNodeId);
          }
        }
      } else if (completedNodeState?.status === NODE_STATUSES.FAILED) {
        state = {
          ...state,
          status: WORKFLOW_STATUSES.FAILED,
          updatedAt: new Date().toISOString(),
        };
        await this.persistState(state);
        this.publishWorkflowEvent(WORKFLOW_EVENT_TYPES.WORKFLOW_FAILED, state);
        this.publishDomainWorkflowEvent(WORKFLOW_EVENTS.FAILED, state);
        return state;
      }
    }

    if (state.status === WORKFLOW_STATUSES.RUNNING && isWorkflowFinished(state)) {
      state = finalizeWorkflowStatus(state);
      await this.persistState(state);
      const eventType =
        state.status === WORKFLOW_STATUSES.COMPLETED
          ? WORKFLOW_EVENT_TYPES.WORKFLOW_COMPLETED
          : WORKFLOW_EVENT_TYPES.WORKFLOW_FAILED;
      this.publishWorkflowEvent(eventType, state);
      this.publishDomainWorkflowEvent(
        state.status === WORKFLOW_STATUSES.COMPLETED
          ? WORKFLOW_EVENTS.COMPLETED
          : WORKFLOW_EVENTS.FAILED,
        state,
      );
    }

    return state;
  }

  async resume(
    persistedState: WorkflowState,
    executor: NodeExecutionPort,
    input: SchedulerInput,
  ): Promise<WorkflowState> {
    let state = persistedState;

    for (const [nodeId, nodeState] of state.nodeStates.entries()) {
      if (nodeState.status === NODE_STATUSES.RUNNING || nodeState.status === NODE_STATUSES.QUEUED) {
        state = updateNodeState(state, nodeId, {
          status: NODE_STATUSES.PENDING,
          startedAt: null,
          progress: 0,
        });
      }
    }

    if (state.status === WORKFLOW_STATUSES.FAILED) {
      state = { ...state, status: WORKFLOW_STATUSES.RUNNING };
    }

    return this.execute(state, executor, input);
  }

  private async runNode(
    state: WorkflowState,
    node: DagNode,
    executor: NodeExecutionPort,
    input: SchedulerInput,
  ): Promise<WorkflowState> {
    let currentState = state;
    let attempt = (currentState.nodeStates.get(node.id)?.attempt ?? 0) + 1;

    while (attempt <= this.maxRetries + 1) {
      if (this.abortController.signal.aborted) {
        return updateNodeState(currentState, node.id, {
          status: NODE_STATUSES.CANCELLED,
          completedAt: new Date().toISOString(),
        });
      }

      const startedAt = new Date().toISOString();
      currentState = updateNodeState(currentState, node.id, {
        status: NODE_STATUSES.RUNNING,
        attempt,
        startedAt,
        error: null,
        progress: 0,
      });
      await this.persistState(currentState);
      this.publishNodeEvent(WORKFLOW_EVENT_TYPES.NODE_STARTED, currentState, node.id);
      this.publishDomainNodeEvent(WORKFLOW_EVENTS.NODE_DISPATCHED, currentState, node.id);
      this.publishDomainNodeEvent(WORKFLOW_EVENTS.NODE_STARTED, currentState, node.id);

      try {
        const result = await executor.execute({
          workflowId: input.workflowId,
          jobId: input.jobId,
          nodeId: node.id,
          nodeKind: node.kind,
          languageCode: node.languageCode,
          videoPath: input.videoPath,
          videoFilename: input.videoFilename,
          durationSeconds: input.durationSeconds,
          profile: input.profile,
          output: input.output,
          outputDirectory: input.outputDirectory,
          artifactRoot: currentState.artifactRoot,
          artifacts: collectArtifacts(currentState),
          signal: this.abortController.signal,
          onProgress: (progress) => {
            currentState = updateNodeState(currentState, node.id, { progress });
            this.publishNodeProgress(currentState, node.id, progress);
            if (this.domainEventBus !== undefined) {
              publishWorkflowNodeProgress(this.domainEventBus, currentState, node.id, progress);
            }
          },
        });

        const completedAt = new Date().toISOString();
        currentState = updateNodeState(currentState, node.id, {
          status: NODE_STATUSES.COMPLETED,
          completedAt,
          durationMs: result.durationMs,
          artifacts: { ...result.artifacts },
          progress: 100,
          error: null,
        });
        await this.persistState(currentState);
        this.publishNodeEvent(WORKFLOW_EVENT_TYPES.NODE_COMPLETED, currentState, node.id);
        this.publishDomainNodeEvent(WORKFLOW_EVENTS.NODE_COMPLETED, currentState, node.id);
        return currentState;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Node execution failed.';

        if (!node.retryable || attempt > this.maxRetries) {
          currentState = updateNodeState(currentState, node.id, {
            status: NODE_STATUSES.FAILED,
            completedAt: new Date().toISOString(),
            error: message,
          });
          await this.persistState(currentState);
          this.publishNodeEvent(WORKFLOW_EVENT_TYPES.NODE_FAILED, currentState, node.id);
          this.publishDomainNodeEvent(WORKFLOW_EVENTS.NODE_FAILED, currentState, node.id);
          return currentState;
        }

        currentState = updateNodeState(currentState, node.id, {
          status: NODE_STATUSES.PENDING,
          error: message,
          progress: 0,
        });
        await this.persistState(currentState);
        this.publishNodeEvent(WORKFLOW_EVENT_TYPES.NODE_RETRYING, currentState, node.id);
        this.publishDomainNodeEvent(WORKFLOW_EVENTS.NODE_RETRYING, currentState, node.id);

        const delayMs = this.retryBaseDelayMs * 2 ** (attempt - 1);
        await sleep(delayMs);
        attempt += 1;
      }
    }

    return updateNodeState(currentState, node.id, {
      status: NODE_STATUSES.FAILED,
      error: 'Maximum retry attempts exceeded.',
      completedAt: new Date().toISOString(),
    });
  }

  private async persistState(state: WorkflowState): Promise<void> {
    await this.statePort.persist(state);
    if (this.domainEventBus !== undefined) {
      publishWorkflowStateChanged(this.domainEventBus, state);
    }
  }

  private publishDomainWorkflowEvent(
    type:
      | typeof WORKFLOW_EVENTS.STARTED
      | typeof WORKFLOW_EVENTS.COMPLETED
      | typeof WORKFLOW_EVENTS.FAILED
      | typeof WORKFLOW_EVENTS.CANCELLED,
    state: WorkflowState,
  ): void {
    if (this.domainEventBus !== undefined) {
      publishWorkflowLifecycleEvent(this.domainEventBus, type, state);
    }
  }

  private publishDomainNodeEvent(
    type:
      | typeof WORKFLOW_EVENTS.NODE_QUEUED
      | typeof WORKFLOW_EVENTS.NODE_DISPATCHED
      | typeof WORKFLOW_EVENTS.NODE_STARTED
      | typeof WORKFLOW_EVENTS.NODE_COMPLETED
      | typeof WORKFLOW_EVENTS.NODE_FAILED
      | typeof WORKFLOW_EVENTS.NODE_RETRYING,
    state: WorkflowState,
    nodeId: NodeId,
  ): void {
    if (this.domainEventBus !== undefined) {
      publishWorkflowNodeEvent(this.domainEventBus, type, state, nodeId);
    }
  }

  private publishWorkflowEvent(
    type:
      | typeof WORKFLOW_EVENT_TYPES.WORKFLOW_STARTED
      | typeof WORKFLOW_EVENT_TYPES.WORKFLOW_COMPLETED
      | typeof WORKFLOW_EVENT_TYPES.WORKFLOW_FAILED
      | typeof WORKFLOW_EVENT_TYPES.WORKFLOW_CANCELLED,
    state: WorkflowState,
  ): void {
    this.eventBus.publish({
      type,
      workflowId: state.workflowId,
      jobId: state.jobId,
      timestamp: new Date().toISOString(),
    });
  }

  private publishNodeEvent(
    type:
      | typeof WORKFLOW_EVENT_TYPES.NODE_QUEUED
      | typeof WORKFLOW_EVENT_TYPES.NODE_STARTED
      | typeof WORKFLOW_EVENT_TYPES.NODE_COMPLETED
      | typeof WORKFLOW_EVENT_TYPES.NODE_FAILED
      | typeof WORKFLOW_EVENT_TYPES.NODE_RETRYING,
    state: WorkflowState,
    nodeId: NodeId,
  ): void {
    this.eventBus.publish({
      type,
      workflowId: state.workflowId,
      jobId: state.jobId,
      nodeId,
      timestamp: new Date().toISOString(),
    });
  }

  private publishNodeProgress(state: WorkflowState, nodeId: NodeId, progress: number): void {
    this.eventBus.publish({
      type: WORKFLOW_EVENT_TYPES.NODE_PROGRESS,
      workflowId: state.workflowId,
      jobId: state.jobId,
      nodeId,
      progress,
      timestamp: new Date().toISOString(),
    });
  }
}

export function buildResumeQueue(state: WorkflowState): NodeId[] {
  return getPendingReadyNodes(state).map((node) => node.id);
}
