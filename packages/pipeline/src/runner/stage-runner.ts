import {
  PIPELINE_STAGE_CAPABILITY,
  type ExtensionRuntime,
  type StageExecutionContext,
  type StageExecutionResult,
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

export function createStageRunner(runtime: ExtensionRuntime): StageRunner {
  return {
    async run(
      node: DagNode,
      _state: WorkflowState,
      context: StageExecutionContext,
    ): Promise<StageExecutionResult> {
      const handler = runtime.resolveCapability(PIPELINE_STAGE_CAPABILITY, node.kind);
      await handler.initialize(context);
      const result = await handler.execute(context);
      await handler.validate(result);
      await handler.cleanup();
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
