import { describe, expect, it, vi } from 'vitest';
import { compileWorkflow } from '../compiler/workflow-compiler';
import { createWorkflowEventBus } from '../events/event-bus';
import { InMemoryWorkflowStore } from '../persistence/workflow-store';
import { createWorkflowState } from '../runner/stage-runner';
import { Scheduler } from './scheduler';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import type { StageExecutionResult } from '@dubforge/providers';
import type { DagNode, WorkflowState } from '../dag/types';
import type { StageRunner } from '../runner/stage-runner';

function createRunner(onRun: (node: DagNode) => void): StageRunner {
  return {
    run: async (node): Promise<StageExecutionResult> => {
      onRun(node);
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
      return {
        artifacts: { [node.id]: `/tmp/${node.id}` },
        durationMs: 20,
      };
    },
  };
}

describe('Scheduler', () => {
  it('runs independent language nodes in parallel', async () => {
    const graph = compileWorkflow({
      workflowId: 'wf-scheduler',
      jobId: 'job-scheduler',
      videoPath: '/tmp/video.mp4',
      videoFilename: 'video.mp4',
      durationSeconds: 60,
      targetLanguages: ['hi', 'te'],
      profile: 'fast',
      output: DEFAULT_OUTPUT_CONFIGURATION,
      outputDirectory: '/tmp/output',
      artifactRoot: '/tmp/artifacts/scheduler',
    });

    const state = createWorkflowState(graph, '/tmp/artifacts/scheduler');
    const store = new InMemoryWorkflowStore();
    const eventBus = createWorkflowEventBus();
    const scheduler = new Scheduler(eventBus, store, { maxConcurrency: 4, retryBaseDelayMs: 10 });

    const runningCounts: number[] = [];
    let inFlight = 0;
    const runner = createRunner(() => {
      inFlight += 1;
      runningCounts.push(inFlight);
      setTimeout(() => {
        inFlight -= 1;
      }, 20);
    });

    const finalState = await scheduler.execute(state, runner, {
      workflowId: graph.workflowId,
      jobId: graph.jobId,
      videoPath: '/tmp/video.mp4',
      videoFilename: 'video.mp4',
      durationSeconds: 60,
      profile: 'fast',
      output: DEFAULT_OUTPUT_CONFIGURATION,
      outputDirectory: '/tmp/output',
    });

    expect(finalState.status).toBe('completed');
    expect(Math.max(...runningCounts)).toBeGreaterThan(1);
  }, 30_000);

  it('resumes from persisted completed nodes', async () => {
    const graph = compileWorkflow({
      workflowId: 'wf-resume',
      jobId: 'job-resume',
      videoPath: '/tmp/video.mp4',
      videoFilename: 'video.mp4',
      durationSeconds: 60,
      targetLanguages: ['hi'],
      profile: 'fast',
      output: DEFAULT_OUTPUT_CONFIGURATION,
      outputDirectory: '/tmp/output',
      artifactRoot: '/tmp/artifacts/resume',
    });

    let state = createWorkflowState(graph, '/tmp/artifacts/resume');
    const validateNode = state.graph.nodes.get('validate');
    expect(validateNode).toBeDefined();

    state = {
      ...state,
      status: 'failed',
      nodeStates: new Map([
        [
          'validate',
          {
            nodeId: 'validate',
            status: 'completed',
            attempt: 1,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            durationMs: 10,
            error: null,
            artifacts: ['/tmp/validation.json'],
            progress: 100,
          },
        ],
        ...[...state.nodeStates.entries()].filter(([nodeId]) => nodeId !== 'validate'),
      ]),
    };

    const runner = createRunner(vi.fn());
    const scheduler = new Scheduler(createWorkflowEventBus(), new InMemoryWorkflowStore(), {
      maxConcurrency: 2,
      retryBaseDelayMs: 10,
    });

    const finalState: WorkflowState = await scheduler.resume(state, runner, {
      workflowId: graph.workflowId,
      jobId: graph.jobId,
      videoPath: '/tmp/video.mp4',
      videoFilename: 'video.mp4',
      durationSeconds: 60,
      profile: 'fast',
      output: DEFAULT_OUTPUT_CONFIGURATION,
      outputDirectory: '/tmp/output',
    });

    expect(finalState.nodeStates.get('validate')?.status).toBe('completed');
    expect(finalState.status).toBe('completed');
  }, 30_000);
});
