import type { OutputConfiguration } from '@dubforge/job-config';
import type { TranslationProfile } from '@dubforge/types';
import { DEFAULT_MAX_CONCURRENCY, MAX_NODE_RETRIES, RETRY_BASE_DELAY_MS } from '../constants';
import type { DagNode, NodeExecutionState, NodeId, WorkflowState } from '../dag/types';
import { NODE_STATUSES, WORKFLOW_STATUSES } from '../dag/types';
import type { WorkflowEventBus } from '../events/event-bus';
import { WORKFLOW_EVENT_TYPES } from '../events/event-bus';
import type { WorkflowStore } from '../persistence/workflow-store';
import type { StageRunner } from '../runner/stage-runner';

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
    for (const artifactPath of nodeState.artifacts) {
      const fileName = artifactPath.split('/').pop() ?? artifactPath;
      artifacts[fileName] = artifactPath;
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
  private readonly abortController = new AbortController();

  constructor(
    private readonly eventBus: WorkflowEventBus,
    private readonly store: WorkflowStore,
    options: SchedulerOptions = {},
  ) {
    this.maxConcurrency = options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
    this.maxRetries = options.maxRetries ?? MAX_NODE_RETRIES;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? RETRY_BASE_DELAY_MS;
  }

  cancel(): void {
    this.abortController.abort();
  }

  async execute(
    initialState: WorkflowState,
    runner: StageRunner,
    input: SchedulerInput,
  ): Promise<WorkflowState> {
    let state: WorkflowState = {
      ...initialState,
      status: WORKFLOW_STATUSES.RUNNING,
      updatedAt: new Date().toISOString(),
    };

    await this.store.save(state);
    this.publishWorkflowEvent(WORKFLOW_EVENT_TYPES.WORKFLOW_STARTED, state);

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
        await this.store.save(state);
        this.publishNodeEvent(WORKFLOW_EVENT_TYPES.NODE_QUEUED, state, nodeId);

        const completion = this.runNode(state, node, runner, input).then((nextState) => ({
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
        await this.store.save(state);
        this.publishWorkflowEvent(WORKFLOW_EVENT_TYPES.WORKFLOW_CANCELLED, state);
        return state;
      }

      const completedNodeState = state.nodeStates.get(completion.nodeId);
      if (completedNodeState?.status === NODE_STATUSES.COMPLETED) {
        const nextReady = getPendingReadyNodes(state).map((node) => node.id);
        for (const nodeId of nextReady) {
          if (!readyQueue.includes(nodeId) && !inFlight.has(nodeId)) {
            readyQueue.push(nodeId);
          }
        }
      } else if (completedNodeState?.status === NODE_STATUSES.FAILED) {
        state = {
          ...state,
          status: WORKFLOW_STATUSES.FAILED,
          updatedAt: new Date().toISOString(),
        };
        await this.store.save(state);
        this.publishWorkflowEvent(WORKFLOW_EVENT_TYPES.WORKFLOW_FAILED, state);
        return state;
      }
    }

    if (state.status === WORKFLOW_STATUSES.RUNNING && isWorkflowFinished(state)) {
      state = finalizeWorkflowStatus(state);
      await this.store.save(state);
      const eventType =
        state.status === WORKFLOW_STATUSES.COMPLETED
          ? WORKFLOW_EVENT_TYPES.WORKFLOW_COMPLETED
          : WORKFLOW_EVENT_TYPES.WORKFLOW_FAILED;
      this.publishWorkflowEvent(eventType, state);
    }

    return state;
  }

  async resume(
    persistedState: WorkflowState,
    runner: StageRunner,
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

    return this.execute(state, runner, input);
  }

  private async runNode(
    state: WorkflowState,
    node: DagNode,
    runner: StageRunner,
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
      await this.store.save(currentState);
      this.publishNodeEvent(WORKFLOW_EVENT_TYPES.NODE_STARTED, currentState, node.id);

      try {
        const result = await runner.run(node, currentState, {
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
          },
        });

        const completedAt = new Date().toISOString();
        currentState = updateNodeState(currentState, node.id, {
          status: NODE_STATUSES.COMPLETED,
          completedAt,
          durationMs: result.durationMs,
          artifacts: Object.values(result.artifacts),
          progress: 100,
          error: null,
        });
        await this.store.save(currentState);
        this.publishNodeEvent(WORKFLOW_EVENT_TYPES.NODE_COMPLETED, currentState, node.id);
        return currentState;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Stage execution failed.';

        if (!node.retryable || attempt > this.maxRetries) {
          currentState = updateNodeState(currentState, node.id, {
            status: NODE_STATUSES.FAILED,
            completedAt: new Date().toISOString(),
            error: message,
          });
          await this.store.save(currentState);
          this.publishNodeEvent(WORKFLOW_EVENT_TYPES.NODE_FAILED, currentState, node.id);
          return currentState;
        }

        currentState = updateNodeState(currentState, node.id, {
          status: NODE_STATUSES.PENDING,
          error: message,
          progress: 0,
        });
        await this.store.save(currentState);
        this.publishNodeEvent(WORKFLOW_EVENT_TYPES.NODE_RETRYING, currentState, node.id);

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
