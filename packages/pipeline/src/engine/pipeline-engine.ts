import type { DomainEventBus } from '@dubforge/platform-events';
import type { NodeExecutionPort } from '@dubforge/platform-execution';
import type { Job, PipelineStageStatus, WorkflowTimelineNode } from '@dubforge/types';
import { compileWorkflow, type WorkflowCompileInput } from '../compiler/workflow-compiler';
import { validateDagGraph } from '../dag/validator';
import type { NodeExecutionState, WorkflowState } from '../dag/types';
import { NODE_STATUSES, WORKFLOW_STATUSES } from '../dag/types';
import { createWorkflowEventBus, type WorkflowEventBus } from '../events/event-bus';
import type { WorkflowStatePort } from '../ports/workflow-state-port';
import { createWorkflowState } from '../runner/stage-runner';
import { Scheduler, type SchedulerInput } from '../scheduler/scheduler';

export interface PipelineEngineOptions {
  readonly executor: NodeExecutionPort;
  readonly statePort: WorkflowStatePort;
  readonly domainEventBus?: DomainEventBus;
  readonly maxConcurrency?: number;
}

export interface StartWorkflowRequest extends WorkflowCompileInput {
  readonly videoPath: string;
}

function mapNodeStatus(status: NodeExecutionState['status']): WorkflowTimelineNode['status'] {
  return status;
}

function mapTimelineStatusToStageStatus(
  status: WorkflowTimelineNode['status'],
): PipelineStageStatus {
  switch (status) {
    case 'queued':
    case 'cancelled':
      return 'pending';
    case 'pending':
    case 'running':
    case 'completed':
    case 'failed':
    case 'skipped':
      return status;
    default:
      return 'pending';
  }
}

function calculateJobProgress(state: WorkflowState): number {
  const nodeStates = [...state.nodeStates.values()];
  if (nodeStates.length === 0) {
    return 0;
  }

  const completed = nodeStates.filter((node) => node.status === NODE_STATUSES.COMPLETED).length;
  return Math.round((completed / nodeStates.length) * 100);
}

function mapWorkflowStatusToJobStatus(state: WorkflowState): Job['status'] {
  switch (state.status) {
    case WORKFLOW_STATUSES.PENDING:
      return 'queued';
    case WORKFLOW_STATUSES.RUNNING:
      return 'processing';
    case WORKFLOW_STATUSES.COMPLETED:
      return 'completed';
    case WORKFLOW_STATUSES.FAILED:
      return 'failed';
    case WORKFLOW_STATUSES.CANCELLED:
      return 'cancelled';
    default:
      return 'processing';
  }
}

function buildTimeline(state: WorkflowState): WorkflowTimelineNode[] {
  return [...state.graph.nodes.values()]
    .sort((left, right) => left.layer - right.layer || left.id.localeCompare(right.id))
    .map((node) => {
      const nodeState = state.nodeStates.get(node.id);
      return {
        id: node.id,
        kind: node.kind,
        label: node.label,
        status: mapNodeStatus(nodeState?.status ?? NODE_STATUSES.PENDING),
        progress: nodeState?.progress ?? 0,
        dependencies: [...node.dependencies],
        startedAt: nodeState?.startedAt ?? null,
        completedAt: nodeState?.completedAt ?? null,
        durationMs: nodeState?.durationMs ?? null,
        languageCode: node.languageCode,
        layer: node.layer,
      };
    });
}

function buildLegacyStages(state: WorkflowState): Job['stages'] {
  const stageNames: Job['stages'][number]['name'][] = [
    'validate',
    'extract-audio',
    'speech-recognition',
    'translate',
    'generate-speech',
    'mux',
    'verify',
  ];

  const timeline = buildTimeline(state);

  return stageNames.map((name) => {
    const matchingNodes = timeline.filter((node) => {
      if (name === 'extract-audio') {
        return node.kind === 'extract-audio';
      }
      if (name === 'generate-speech') {
        return node.kind === 'speech';
      }
      return node.kind === name;
    });

    const status = mapTimelineStatusToStageStatus(
      matchingNodes.find((node) => node.status === 'running')?.status ??
        (matchingNodes.length > 0 && matchingNodes.every((node) => node.status === 'completed')
          ? 'completed'
          : matchingNodes.some((node) => node.status === 'failed')
            ? 'failed'
            : matchingNodes.some((node) => node.status === 'running')
              ? 'running'
              : 'pending'),
    );

    const progress =
      matchingNodes.length === 0
        ? 0
        : Math.round(
            matchingNodes.reduce((sum, node) => sum + node.progress, 0) / matchingNodes.length,
          );

    const labels: Record<Job['stages'][number]['name'], string> = {
      validate: 'Validate',
      'extract-audio': 'Extract Audio',
      'speech-recognition': 'Speech Recognition',
      translate: 'Translate',
      'generate-speech': 'Generate Speech',
      mux: 'Mux',
      verify: 'Verify',
    };

    return {
      name,
      label: labels[name],
      status,
      progress,
    };
  });
}

export function workflowStateToJob(
  state: WorkflowState,
  filename: string,
  languages: readonly string[],
  outputDirectory: string,
): Job {
  const failedNode = [...state.nodeStates.values()].find(
    (nodeState) => nodeState.status === NODE_STATUSES.FAILED,
  );

  return {
    id: state.jobId,
    filename,
    status: mapWorkflowStatusToJobStatus(state),
    languages,
    progress: calculateJobProgress(state),
    startedAt: state.createdAt,
    finishedAt:
      state.status === WORKFLOW_STATUSES.COMPLETED ||
      state.status === WORKFLOW_STATUSES.FAILED ||
      state.status === WORKFLOW_STATUSES.CANCELLED
        ? state.updatedAt
        : null,
    durationSeconds: null,
    outputPath: outputDirectory,
    stages: buildLegacyStages(state),
    timeline: buildTimeline(state),
    error:
      failedNode?.error !== undefined && failedNode.error !== null
        ? {
            title: 'Pipeline stage failed',
            description: failedNode.error,
            recoveryAction: 'Retry the job or review the workflow timeline for details.',
          }
        : null,
  };
}

export class PipelineEngine {
  private readonly eventBus: WorkflowEventBus = createWorkflowEventBus();
  private activeScheduler: Scheduler | null = null;
  private activeState: WorkflowState | null = null;

  constructor(private readonly options: PipelineEngineOptions) {}

  getEventBus(): WorkflowEventBus {
    return this.eventBus;
  }

  getActiveState(): WorkflowState | null {
    return this.activeState;
  }

  async start(request: StartWorkflowRequest): Promise<WorkflowState> {
    const graph = compileWorkflow(request);
    const validation = validateDagGraph(graph);
    if (!validation.valid) {
      const firstIssue = validation.issues[0];
      throw new Error(firstIssue?.message ?? 'Invalid workflow graph.');
    }

    const initialState = createWorkflowState(graph, request.artifactRoot);
    const scheduler = new Scheduler(this.eventBus, this.options.statePort, {
      maxConcurrency: this.options.maxConcurrency,
      domainEventBus: this.options.domainEventBus,
    });

    this.activeScheduler = scheduler;
    this.activeState = initialState;

    const input: SchedulerInput = {
      workflowId: request.workflowId,
      jobId: request.jobId,
      videoPath: request.videoPath,
      videoFilename: request.videoFilename,
      durationSeconds: request.durationSeconds,
      profile: request.profile,
      output: request.output,
      outputDirectory: request.outputDirectory,
    };

    const finalState = await scheduler.execute(initialState, this.options.executor, input);
    this.activeState = finalState;
    this.activeScheduler = null;
    return finalState;
  }

  async resume(request: StartWorkflowRequest): Promise<WorkflowState> {
    const persisted = await this.options.statePort.restore(
      request.workflowId,
      request.artifactRoot,
    );
    if (persisted === null) {
      return this.start(request);
    }

    const scheduler = new Scheduler(this.eventBus, this.options.statePort, {
      maxConcurrency: this.options.maxConcurrency,
      domainEventBus: this.options.domainEventBus,
    });

    this.activeScheduler = scheduler;
    this.activeState = persisted;

    const input: SchedulerInput = {
      workflowId: request.workflowId,
      jobId: request.jobId,
      videoPath: request.videoPath,
      videoFilename: request.videoFilename,
      durationSeconds: request.durationSeconds,
      profile: request.profile,
      output: request.output,
      outputDirectory: request.outputDirectory,
    };

    const finalState = await scheduler.resume(persisted, this.options.executor, input);
    this.activeState = finalState;
    this.activeScheduler = null;
    return finalState;
  }

  cancel(): void {
    this.activeScheduler?.cancel();
  }
}
