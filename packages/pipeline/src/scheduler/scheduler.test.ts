import { describe, expect, it, vi } from 'vitest';
import { compileWorkflow } from '../compiler/workflow-compiler';
import { createWorkflowEventBus } from '../events/event-bus';
import { InMemoryWorkflowStatePort } from '../ports/in-memory-workflow-state-port';
import type { NodeExecutionPort } from '../ports/node-execution-port';
import { createWorkflowState } from '../runner/stage-runner';
import { Scheduler } from './scheduler';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import type { DagNode, WorkflowState } from '../dag/types';

function createExecutor(onRun: (node: DagNode) => void): NodeExecutionPort {
  return {
    execute: async (request) => {
      onRun({ id: request.nodeId, kind: request.nodeKind } as DagNode);
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
      return {
        artifacts: { [request.nodeId]: `/tmp/${request.nodeId}` },
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
    const statePort = new InMemoryWorkflowStatePort();
    const eventBus = createWorkflowEventBus();
    const scheduler = new Scheduler(eventBus, statePort, {
      maxConcurrency: 4,
      retryBaseDelayMs: 10,
    });

    const runningCounts: number[] = [];
    let inFlight = 0;
    const executor = createExecutor(() => {
      inFlight += 1;
      runningCounts.push(inFlight);
      setTimeout(() => {
        inFlight -= 1;
      }, 20);
    });

    const finalState = await scheduler.execute(state, executor, {
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
            artifacts: { validate: '/tmp/validation.json' },
            progress: 100,
          },
        ],
        ...[...state.nodeStates.entries()].filter(([nodeId]) => nodeId !== 'validate'),
      ]),
    };

    const executor = createExecutor(vi.fn());
    const scheduler = new Scheduler(createWorkflowEventBus(), new InMemoryWorkflowStatePort(), {
      maxConcurrency: 2,
      retryBaseDelayMs: 10,
    });

    const finalState: WorkflowState = await scheduler.resume(state, executor, {
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
