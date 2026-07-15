import type {
  ProviderRegistry,
  StageExecutionContext,
  StageExecutionResult,
} from '@dubforge/providers';
import type { DagNode, NodeExecutionState, NodeId, WorkflowState } from '../dag/types';
import { NODE_STATUSES } from '../dag/types';

export interface StageRunner {
  run(
    node: DagNode,
    state: WorkflowState,
    context: StageExecutionContext,
  ): Promise<StageExecutionResult>;
}

export function createStageRunner(registry: ProviderRegistry): StageRunner {
  return {
    async run(
      node: DagNode,
      state: WorkflowState,
      context: StageExecutionContext,
    ): Promise<StageExecutionResult> {
      const provider = registry.resolve(node.kind);
      await provider.initialize(context);
      const result = await provider.execute(context);
      await provider.validate(result);
      await provider.cleanup();
      return result;
    },
  };
}

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
      artifacts: [],
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
