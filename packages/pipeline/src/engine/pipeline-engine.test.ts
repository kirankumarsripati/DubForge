import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { compileWorkflow } from '../compiler/workflow-compiler';
import { PipelineEngine } from '../engine/pipeline-engine';
import { FileWorkflowStore } from '../persistence/workflow-store';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import { createProviderRegistry, registerFakeProviders } from '@dubforge/providers';
import type { DagNode } from '../dag/types';
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
  it('executes a workflow with fake providers and persists state', async () => {
    const artifactRoot = await createArtifactRoot();
    const registry = createProviderRegistry();
    registerFakeProviders(registry);

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
    const store = new FileWorkflowStore();
    const scheduler = new Scheduler(createWorkflowEventBus(), store, {
      maxConcurrency: 4,
      retryBaseDelayMs: 10,
    });

    const runner = {
      run: async (node: DagNode) => ({
        artifacts: { [node.id]: join(artifactRoot, `${node.id}.json`) },
        durationMs: 5,
      }),
    };

    const finalState = await scheduler.execute(state, runner, {
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

    const persisted = await store.load('wf-engine', artifactRoot);
    expect(persisted?.status).toBe('completed');
  });

  it('starts workflows through the engine facade', async () => {
    const artifactRoot = await createArtifactRoot();
    const registry = createProviderRegistry();
    registerFakeProviders(registry);

    const engine = new PipelineEngine({
      registry,
      store: new FileWorkflowStore(),
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
  }, 120_000);
});
