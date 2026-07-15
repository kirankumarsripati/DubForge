import type { NodeKind } from '@dubforge/types';

export const WORKFLOW_EVENTS = {
  STARTED: 'workflow.started',
  COMPLETED: 'workflow.completed',
  FAILED: 'workflow.failed',
  CANCELLED: 'workflow.cancelled',
  STATE_CHANGED: 'workflow.state-changed',
  NODE_QUEUED: 'workflow.node-queued',
  NODE_DISPATCHED: 'workflow.node-dispatched',
  NODE_STARTED: 'workflow.node-started',
  NODE_PROGRESS: 'workflow.node-progress',
  NODE_COMPLETED: 'workflow.node-completed',
  NODE_FAILED: 'workflow.node-failed',
  NODE_RETRYING: 'workflow.node-retrying',
} as const;

export const EXECUTION_EVENTS = {
  REQUESTED: 'execution.requested',
  STARTED: 'execution.started',
  PROGRESS: 'execution.progress',
  COMPLETED: 'execution.completed',
  FAILED: 'execution.failed',
  CANCELLED: 'execution.cancelled',
  TIMED_OUT: 'execution.timed-out',
} as const;

export const ARTIFACT_EVENTS = {
  REGISTERED: 'artifact.registered',
  RESOLVED: 'artifact.resolved',
  PERSISTED: 'artifact.persisted',
  DELETED: 'artifact.deleted',
} as const;

export const RESOURCE_EVENTS = {
  SNAPSHOT: 'resource.snapshot',
  THRESHOLD_EXCEEDED: 'resource.threshold-exceeded',
} as const;

export const OBSERVABILITY_EVENTS = {
  LOG_RECORDED: 'observability.log-recorded',
  METRIC_RECORDED: 'observability.metric-recorded',
  TIMELINE_ENTRY: 'observability.timeline-entry',
  SPAN_STARTED: 'observability.span-started',
  SPAN_ENDED: 'observability.span-ended',
} as const;

export interface DomainEventBase {
  readonly id: string;
  readonly timestamp: string;
  readonly workflowId: string;
  readonly jobId: string;
}

export interface WorkflowLifecycleEvent extends DomainEventBase {
  readonly type:
    | typeof WORKFLOW_EVENTS.STARTED
    | typeof WORKFLOW_EVENTS.COMPLETED
    | typeof WORKFLOW_EVENTS.FAILED
    | typeof WORKFLOW_EVENTS.CANCELLED;
}

export interface WorkflowStateChangedEvent extends DomainEventBase {
  readonly type: typeof WORKFLOW_EVENTS.STATE_CHANGED;
  readonly status: string;
}

export interface WorkflowNodeEvent extends DomainEventBase {
  readonly type:
    | typeof WORKFLOW_EVENTS.NODE_QUEUED
    | typeof WORKFLOW_EVENTS.NODE_DISPATCHED
    | typeof WORKFLOW_EVENTS.NODE_STARTED
    | typeof WORKFLOW_EVENTS.NODE_COMPLETED
    | typeof WORKFLOW_EVENTS.NODE_FAILED
    | typeof WORKFLOW_EVENTS.NODE_RETRYING;
  readonly nodeId: string;
}

export interface WorkflowNodeProgressEvent extends DomainEventBase {
  readonly type: typeof WORKFLOW_EVENTS.NODE_PROGRESS;
  readonly nodeId: string;
  readonly progress: number;
}

export interface ExecutionLifecycleEvent extends DomainEventBase {
  readonly type:
    | typeof EXECUTION_EVENTS.REQUESTED
    | typeof EXECUTION_EVENTS.STARTED
    | typeof EXECUTION_EVENTS.COMPLETED
    | typeof EXECUTION_EVENTS.FAILED
    | typeof EXECUTION_EVENTS.CANCELLED
    | typeof EXECUTION_EVENTS.TIMED_OUT;
  readonly nodeId: string;
  readonly adapterKind: string;
  readonly artifacts?: Readonly<Record<string, string>>;
}

export interface ExecutionProgressEvent extends DomainEventBase {
  readonly type: typeof EXECUTION_EVENTS.PROGRESS;
  readonly nodeId: string;
  readonly progress: number;
}

export interface ArtifactLifecycleEvent extends DomainEventBase {
  readonly type:
    | typeof ARTIFACT_EVENTS.REGISTERED
    | typeof ARTIFACT_EVENTS.RESOLVED
    | typeof ARTIFACT_EVENTS.PERSISTED
    | typeof ARTIFACT_EVENTS.DELETED;
  readonly artifactId: string;
  readonly nodeId: string | null;
  readonly path: string;
}

export interface ResourceSnapshotEvent extends DomainEventBase {
  readonly type: typeof RESOURCE_EVENTS.SNAPSHOT;
  readonly cpuPercent: number;
  readonly memoryUsedMb: number;
  readonly memoryTotalMb: number;
  readonly gpuPercent: number | null;
  readonly diskUsedGb: number;
  readonly diskTotalGb: number;
}

export interface ResourceThresholdEvent extends DomainEventBase {
  readonly type: typeof RESOURCE_EVENTS.THRESHOLD_EXCEEDED;
  readonly resource: string;
  readonly value: number;
  readonly threshold: number;
}

export interface ObservabilityLogEvent extends DomainEventBase {
  readonly type: typeof OBSERVABILITY_EVENTS.LOG_RECORDED;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly message: string;
  readonly context: Readonly<Record<string, string>>;
}

export interface ObservabilityMetricEvent extends DomainEventBase {
  readonly type: typeof OBSERVABILITY_EVENTS.METRIC_RECORDED;
  readonly name: string;
  readonly value: number;
  readonly unit: string;
}

export interface ObservabilityTimelineEvent extends DomainEventBase {
  readonly type: typeof OBSERVABILITY_EVENTS.TIMELINE_ENTRY;
  readonly nodeId: string | null;
  readonly nodeKind: NodeKind | null;
  readonly label: string;
  readonly status: string;
}

export interface ObservabilitySpanEvent extends DomainEventBase {
  readonly type: typeof OBSERVABILITY_EVENTS.SPAN_STARTED | typeof OBSERVABILITY_EVENTS.SPAN_ENDED;
  readonly spanId: string;
  readonly spanName: string;
  readonly parentSpanId: string | null;
}

export type DomainEvent =
  | WorkflowLifecycleEvent
  | WorkflowStateChangedEvent
  | WorkflowNodeEvent
  | WorkflowNodeProgressEvent
  | ExecutionLifecycleEvent
  | ExecutionProgressEvent
  | ArtifactLifecycleEvent
  | ResourceSnapshotEvent
  | ResourceThresholdEvent
  | ObservabilityLogEvent
  | ObservabilityMetricEvent
  | ObservabilityTimelineEvent
  | ObservabilitySpanEvent;

export type DomainEventType = DomainEvent['type'];

export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void;
