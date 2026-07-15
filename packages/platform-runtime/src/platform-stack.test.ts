import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';

import { createPlatformStack } from './platform-stack.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('PlatformStack', () => {
  it('wires platforms and executes workflow through orchestrator only', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-platform-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'workflow-artifacts');

    const stack = createPlatformStack({
      rootPath,
      maxConcurrency: 2,
      useFixtureMediaAdapters: true,
      useFixtureTranscriptionAdapters: true,
      useFixtureLocalizationAdapters: true,
      useFixtureVoicePerformanceAdapters: true,
      useFixtureTemporalAdapters: true,
      useFixtureDeliveryAdapters: true,
    });

    const finalState = await stack.engine.start({
      workflowId: 'wf-platform',
      jobId: 'job-platform',
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

    const failedNodes = [...finalState.nodeStates.entries()].filter(
      ([, node]) => node.status === 'failed',
    );
    expect(
      failedNodes,
      failedNodes.map(([id, node]) => `${id}: ${node.error ?? 'unknown'}`).join('; '),
    ).toHaveLength(0);
    expect(finalState.status).toBe('completed');
    expect(stack.observabilityPlatform.getLogger().getEntries().length).toBeGreaterThan(0);
    stack.dispose();
  }, 120_000);
});
