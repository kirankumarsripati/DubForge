import {
  createDomainEventId,
  WORKFLOW_EVENTS,
  type DomainEventBus,
} from '@dubforge/platform-events';

import type { NodeId, WorkflowState } from '../dag/types.js';

export function publishWorkflowLifecycleEvent(
  eventBus: DomainEventBus,
  type:
    | typeof WORKFLOW_EVENTS.STARTED
    | typeof WORKFLOW_EVENTS.COMPLETED
    | typeof WORKFLOW_EVENTS.FAILED
    | typeof WORKFLOW_EVENTS.CANCELLED,
  state: WorkflowState,
): void {
  eventBus.publish({
    id: createDomainEventId(),
    type,
    timestamp: new Date().toISOString(),
    workflowId: state.workflowId,
    jobId: state.jobId,
  });

  eventBus.publish({
    id: createDomainEventId(),
    type: WORKFLOW_EVENTS.STATE_CHANGED,
    timestamp: new Date().toISOString(),
    workflowId: state.workflowId,
    jobId: state.jobId,
    status: state.status,
  });
}

export function publishWorkflowNodeEvent(
  eventBus: DomainEventBus,
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
  eventBus.publish({
    id: createDomainEventId(),
    type,
    timestamp: new Date().toISOString(),
    workflowId: state.workflowId,
    jobId: state.jobId,
    nodeId,
  });
}

export function publishWorkflowNodeProgress(
  eventBus: DomainEventBus,
  state: WorkflowState,
  nodeId: NodeId,
  progress: number,
): void {
  eventBus.publish({
    id: createDomainEventId(),
    type: WORKFLOW_EVENTS.NODE_PROGRESS,
    timestamp: new Date().toISOString(),
    workflowId: state.workflowId,
    jobId: state.jobId,
    nodeId,
    progress,
  });
}

export function publishWorkflowStateChanged(eventBus: DomainEventBus, state: WorkflowState): void {
  eventBus.publish({
    id: createDomainEventId(),
    type: WORKFLOW_EVENTS.STATE_CHANGED,
    timestamp: new Date().toISOString(),
    workflowId: state.workflowId,
    jobId: state.jobId,
    status: state.status,
  });
}
