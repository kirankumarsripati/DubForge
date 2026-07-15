import type {
  DagGraph,
  DagNode,
  NodeExecutionState,
  NodeId,
  SerializedDagGraph,
  SerializedDagNode,
  SerializedNodeExecutionState,
  SerializedWorkflowState,
  WorkflowState,
} from './types';

export function serializeDagNode(node: DagNode): SerializedDagNode {
  return {
    id: node.id,
    kind: node.kind,
    label: node.label,
    dependencies: [...node.dependencies],
    retryable: node.retryable,
    languageCode: node.languageCode,
    layer: node.layer,
  };
}

export function deserializeDagNode(node: SerializedDagNode): DagNode {
  return {
    id: node.id,
    kind: node.kind,
    label: node.label,
    dependencies: [...node.dependencies],
    retryable: node.retryable,
    languageCode: node.languageCode,
    layer: node.layer,
  };
}

export function serializeDagGraph(graph: DagGraph): SerializedDagGraph {
  return {
    workflowId: graph.workflowId,
    jobId: graph.jobId,
    nodes: [...graph.nodes.values()].map(serializeDagNode),
    roots: [...graph.roots],
  };
}

export function deserializeDagGraph(graph: SerializedDagGraph): DagGraph {
  const nodes = new Map<NodeId, DagNode>(
    graph.nodes.map((node) => [node.id, deserializeDagNode(node)]),
  );

  return {
    workflowId: graph.workflowId,
    jobId: graph.jobId,
    nodes,
    roots: [...graph.roots],
  };
}

export function serializeNodeExecutionState(
  state: NodeExecutionState,
): SerializedNodeExecutionState {
  return {
    nodeId: state.nodeId,
    status: state.status,
    attempt: state.attempt,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    durationMs: state.durationMs,
    error: state.error,
    artifacts: { ...state.artifacts },
    progress: state.progress,
  };
}

export function deserializeNodeExecutionState(
  state: SerializedNodeExecutionState,
): NodeExecutionState {
  return {
    nodeId: state.nodeId,
    status: state.status,
    attempt: state.attempt,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    durationMs: state.durationMs,
    error: state.error,
    artifacts: { ...state.artifacts },
    progress: state.progress,
  };
}

export function serializeWorkflowState(state: WorkflowState): SerializedWorkflowState {
  return {
    workflowId: state.workflowId,
    jobId: state.jobId,
    graph: serializeDagGraph(state.graph),
    nodeStates: [...state.nodeStates.values()].map(serializeNodeExecutionState),
    status: state.status,
    artifactRoot: state.artifactRoot,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}

export function deserializeWorkflowState(state: SerializedWorkflowState): WorkflowState {
  const nodeStates = new Map<NodeId, NodeExecutionState>(
    state.nodeStates.map((nodeState) => [
      nodeState.nodeId,
      deserializeNodeExecutionState(nodeState),
    ]),
  );

  return {
    workflowId: state.workflowId,
    jobId: state.jobId,
    graph: deserializeDagGraph(state.graph),
    nodeStates,
    status: state.status,
    artifactRoot: state.artifactRoot,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}
