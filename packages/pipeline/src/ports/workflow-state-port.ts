import type { WorkflowState } from '../dag/types.js';

export interface WorkflowStatePort {
  persist(state: WorkflowState): Promise<void>;
  restore(workflowId: string, artifactRoot: string): Promise<WorkflowState | null>;
}
