import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { WORKFLOW_STATE_FILENAME } from '../constants';
import { deserializeWorkflowState, serializeWorkflowState } from '../dag/serializer';
import type { SerializedWorkflowState, WorkflowState } from '../dag/types';

export interface WorkflowStore {
  save(state: WorkflowState): Promise<void>;
  load(workflowId: string, artifactRoot: string): Promise<WorkflowState | null>;
  list(artifactRoot: string): Promise<readonly WorkflowState[]>;
}

function getStatePath(artifactRoot: string): string {
  return join(artifactRoot, WORKFLOW_STATE_FILENAME);
}

export class FileWorkflowStore implements WorkflowStore {
  async save(state: WorkflowState): Promise<void> {
    await mkdir(state.artifactRoot, { recursive: true });
    const serialized = serializeWorkflowState({
      ...state,
      updatedAt: new Date().toISOString(),
    });
    await writeFile(getStatePath(state.artifactRoot), JSON.stringify(serialized, null, 2), 'utf8');
  }

  async load(_workflowId: string, artifactRoot: string): Promise<WorkflowState | null> {
    try {
      const content = await readFile(getStatePath(artifactRoot), 'utf8');
      const parsed = JSON.parse(content) as SerializedWorkflowState;
      return deserializeWorkflowState(parsed);
    } catch {
      return null;
    }
  }

  async list(artifactRoot: string): Promise<readonly WorkflowState[]> {
    const state = await this.load('', artifactRoot);
    return state === null ? [] : [state];
  }
}

export class InMemoryWorkflowStore implements WorkflowStore {
  private readonly states = new Map<string, WorkflowState>();

  save(state: WorkflowState): Promise<void> {
    this.states.set(state.workflowId, {
      ...state,
      updatedAt: new Date().toISOString(),
    });
    return Promise.resolve();
  }

  load(workflowId: string, artifactRoot: string): Promise<WorkflowState | null> {
    const state = this.states.get(workflowId);
    if (state?.artifactRoot !== artifactRoot) {
      return Promise.resolve(null);
    }
    return Promise.resolve(state);
  }

  list(artifactRoot: string): Promise<readonly WorkflowState[]> {
    return Promise.resolve(
      [...this.states.values()].filter((state) => state.artifactRoot === artifactRoot),
    );
  }
}
