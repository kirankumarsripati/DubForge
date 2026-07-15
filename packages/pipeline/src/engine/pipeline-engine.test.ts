import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { compileWorkflow } from '../compiler/workflow-compiler';
import { InMemoryWorkflowStatePort } from '../ports/in-memory-workflow-state-port';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import { createWorkflowEventBus } from '../events/event-bus';
import { createWorkflowState } from '../runner/stage-runner';
import { Scheduler } from '../scheduler/scheduler';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createArtifactRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dubforge-pipeline-'));
  tempDirs.push(dir);
  return dir;
}

describe('PipelineEngine', () => {
  it('executes a workflow and persists state through ports', async () => {
    const artifactRoot = await createArtifactRoot();

    const graph = compileWorkflow({
      workflowId: 'wf-engine',
      jobId: 'job-engine',
      videoPath: '/tmp/video.mp4',
      videoFilename: 'video.mp4',
      durationSeconds: 10,
      targetLanguages: ['hi'],
      profile: 'fast',
      output: {
        ...DEFAULT_OUTPUT_CONFIGURATION,
        generateTranslatedAudio: false,
      },
      outputDirectory: '/tmp/output',
      artifactRoot,
    });

    const state = createWorkflowState(graph, artifactRoot);
    const statePort = new InMemoryWorkflowStatePort();
    const scheduler = new Scheduler(createWorkflowEventBus(), statePort, {
      maxConcurrency: 4,
      retryBaseDelayMs: 10,
    });

    const executor = {
      execute: (request: { nodeId: string }) =>
        Promise.resolve({
          artifacts: { [request.nodeId]: join(artifactRoot, `${request.nodeId}.json`) },
          durationMs: 5,
        }),
    };

    const finalState = await scheduler.execute(state, executor, {
      workflowId: graph.workflowId,
      jobId: graph.jobId,
      videoPath: '/tmp/video.mp4',
      videoFilename: 'video.mp4',
      durationSeconds: 10,
      profile: 'fast',
      output: {
        ...DEFAULT_OUTPUT_CONFIGURATION,
        generateTranslatedAudio: false,
      },
      outputDirectory: '/tmp/output',
    });

    expect(finalState.status).toBe('completed');

    const persisted = await statePort.restore('wf-engine', artifactRoot);
    expect(persisted?.status).toBe('completed');
  });

  it('starts workflows through the engine facade', async () => {
    const artifactRoot = await createArtifactRoot();
    const statePort = new InMemoryWorkflowStatePort();

    const engine = new (await import('../engine/pipeline-engine.js')).PipelineEngine({
      executor: {
        execute: (request) =>
          Promise.resolve({
            artifacts: { [request.nodeKind]: join(artifactRoot, `${request.nodeId}.json`) },
            durationMs: 5,
          }),
      },
      statePort,
      maxConcurrency: 2,
    });

    const finalState = await engine.start({
      workflowId: 'wf-facade',
      jobId: 'job-facade',
      videoPath: '/tmp/video.mp4',
      videoFilename: 'video.mp4',
      durationSeconds: 5,
      targetLanguages: ['hi'],
      profile: 'fast',
      output: {
        ...DEFAULT_OUTPUT_CONFIGURATION,
        generateTranslatedAudio: false,
        generateSubtitles: false,
        exportSrt: false,
      },
      outputDirectory: '/tmp/output',
      artifactRoot,
    });

    expect(finalState.status).toBe('completed');
  });
});
