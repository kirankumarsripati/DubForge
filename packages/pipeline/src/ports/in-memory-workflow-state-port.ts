import type { WorkflowState } from '../dag/types.js';
import type { WorkflowStatePort } from '../ports/workflow-state-port.js';

export class InMemoryWorkflowStatePort implements WorkflowStatePort {
  private readonly states = new Map<string, WorkflowState>();

  persist(state: WorkflowState): Promise<void> {
    this.states.set(state.workflowId, {
      ...state,
      updatedAt: new Date().toISOString(),
    });
    return Promise.resolve();
  }

  restore(workflowId: string, artifactRoot: string): Promise<WorkflowState | null> {
    const state = this.states.get(workflowId);
    if (state?.artifactRoot !== artifactRoot) {
      return Promise.resolve(null);
    }
    return Promise.resolve(state);
  }
}
