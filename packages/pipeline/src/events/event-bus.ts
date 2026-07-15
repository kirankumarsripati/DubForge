import type { NodeId } from '../dag/types';

export const WORKFLOW_EVENT_TYPES = {
  WORKFLOW_STARTED: 'workflow:started',
  WORKFLOW_COMPLETED: 'workflow:completed',
  WORKFLOW_FAILED: 'workflow:failed',
  WORKFLOW_CANCELLED: 'workflow:cancelled',
  NODE_QUEUED: 'node:queued',
  NODE_STARTED: 'node:started',
  NODE_PROGRESS: 'node:progress',
  NODE_COMPLETED: 'node:completed',
  NODE_FAILED: 'node:failed',
  NODE_RETRYING: 'node:retrying',
} as const;

export type WorkflowEventType = (typeof WORKFLOW_EVENT_TYPES)[keyof typeof WORKFLOW_EVENT_TYPES];

export interface WorkflowEventBase {
  readonly type: WorkflowEventType;
  readonly workflowId: string;
  readonly jobId: string;
  readonly timestamp: string;
}

export interface WorkflowLifecycleEvent extends WorkflowEventBase {
  readonly type:
    | typeof WORKFLOW_EVENT_TYPES.WORKFLOW_STARTED
    | typeof WORKFLOW_EVENT_TYPES.WORKFLOW_COMPLETED
    | typeof WORKFLOW_EVENT_TYPES.WORKFLOW_FAILED
    | typeof WORKFLOW_EVENT_TYPES.WORKFLOW_CANCELLED;
}

export interface NodeLifecycleEvent extends WorkflowEventBase {
  readonly type:
    | typeof WORKFLOW_EVENT_TYPES.NODE_QUEUED
    | typeof WORKFLOW_EVENT_TYPES.NODE_STARTED
    | typeof WORKFLOW_EVENT_TYPES.NODE_COMPLETED
    | typeof WORKFLOW_EVENT_TYPES.NODE_FAILED
    | typeof WORKFLOW_EVENT_TYPES.NODE_RETRYING;
  readonly nodeId: NodeId;
}

export interface NodeProgressEvent extends WorkflowEventBase {
  readonly type: typeof WORKFLOW_EVENT_TYPES.NODE_PROGRESS;
  readonly nodeId: NodeId;
  readonly progress: number;
}

export type WorkflowEvent = WorkflowLifecycleEvent | NodeLifecycleEvent | NodeProgressEvent;

export type WorkflowEventHandler = (event: WorkflowEvent) => void;

export interface WorkflowEventBus {
  publish(event: WorkflowEvent): void;
  subscribe(handler: WorkflowEventHandler): () => void;
}

export function createWorkflowEventBus(): WorkflowEventBus {
  const handlers = new Set<WorkflowEventHandler>();

  return {
    publish(event: WorkflowEvent): void {
      for (const handler of handlers) {
        handler(event);
      }
    },
    subscribe(handler: WorkflowEventHandler): () => void {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
  };
}
