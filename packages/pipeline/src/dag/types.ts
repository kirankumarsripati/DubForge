import { NODE_KINDS, type NodeKind } from '@dubforge/types';

export { NODE_KINDS, type NodeKind };

export type NodeId = string;

export interface DagNode {
  readonly id: NodeId;
  readonly kind: NodeKind;
  readonly label: string;
  readonly dependencies: readonly NodeId[];
  readonly retryable: boolean;
  readonly languageCode: string | null;
  readonly layer: number;
}

export interface DagGraph {
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodes: ReadonlyMap<NodeId, DagNode>;
  readonly roots: readonly NodeId[];
}

export const NODE_STATUSES = {
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  CANCELLED: 'cancelled',
} as const;

export type NodeStatus = (typeof NODE_STATUSES)[keyof typeof NODE_STATUSES];

export interface NodeExecutionState {
  readonly nodeId: NodeId;
  readonly status: NodeStatus;
  readonly attempt: number;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly durationMs: number | null;
  readonly error: string | null;
  readonly artifacts: Readonly<Record<string, string>>;
  readonly progress: number;
}

export const WORKFLOW_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[keyof typeof WORKFLOW_STATUSES];

export interface WorkflowState {
  readonly workflowId: string;
  readonly jobId: string;
  readonly graph: DagGraph;
  readonly nodeStates: ReadonlyMap<NodeId, NodeExecutionState>;
  readonly status: WorkflowStatus;
  readonly artifactRoot: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SerializedDagNode {
  readonly id: NodeId;
  readonly kind: NodeKind;
  readonly label: string;
  readonly dependencies: readonly NodeId[];
  readonly retryable: boolean;
  readonly languageCode: string | null;
  readonly layer: number;
}

export interface SerializedDagGraph {
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodes: readonly SerializedDagNode[];
  readonly roots: readonly NodeId[];
}

export interface SerializedNodeExecutionState {
  readonly nodeId: NodeId;
  readonly status: NodeStatus;
  readonly attempt: number;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly durationMs: number | null;
  readonly error: string | null;
  readonly artifacts: Readonly<Record<string, string>>;
  readonly progress: number;
}

export interface SerializedWorkflowState {
  readonly workflowId: string;
  readonly jobId: string;
  readonly graph: SerializedDagGraph;
  readonly nodeStates: readonly SerializedNodeExecutionState[];
  readonly status: WorkflowStatus;
  readonly artifactRoot: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
