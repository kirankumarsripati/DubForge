import type { NodeExecutionState, NodeId, WorkflowState } from '../dag/types.js';
import { NODE_STATUSES } from '../dag/types.js';

export function createInitialNodeStates(
  graph: WorkflowState['graph'],
): Map<NodeId, NodeExecutionState> {
  const nodeStates = new Map<NodeId, NodeExecutionState>();

  for (const node of graph.nodes.values()) {
    nodeStates.set(node.id, {
      nodeId: node.id,
      status: NODE_STATUSES.PENDING,
      attempt: 0,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      error: null,
      artifacts: {},
      progress: 0,
    });
  }

  return nodeStates;
}

export function createWorkflowState(
  graph: WorkflowState['graph'],
  artifactRoot: string,
): WorkflowState {
  const now = new Date().toISOString();

  return {
    workflowId: graph.workflowId,
    jobId: graph.jobId,
    graph,
    nodeStates: createInitialNodeStates(graph),
    status: 'pending',
    artifactRoot,
    createdAt: now,
    updatedAt: now,
  };
}
