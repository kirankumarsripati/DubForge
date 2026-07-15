import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { NODE_KINDS } from '@dubforge/types';
import type { StageExecutionContext } from '../stage/types';
import { createFakeValidateProvider } from './providers';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function createContext(
  artifactRoot: string,
  onProgress: (progress: number) => void,
): StageExecutionContext {
  const controller = new AbortController();

  return {
    workflowId: 'wf-1',
    jobId: 'job-1',
    nodeId: 'validate',
    nodeKind: NODE_KINDS.VALIDATE,
    languageCode: null,
    videoPath: '/tmp/video.mp4',
    videoFilename: 'video.mp4',
    durationSeconds: 60,
    profile: 'fast',
    output: {
      generateTranslatedAudio: true,
      generateSubtitles: true,
      embedSubtitles: true,
      exportSrt: false,
      exportTranscript: true,
      containerFormat: 'mkv',
    },
    outputDirectory: '/tmp/output',
    artifactRoot,
    artifacts: {},
    signal: controller.signal,
    onProgress,
  };
}

describe('fake providers', () => {
  it('writes placeholder artifacts with simulated timing', async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), 'dubforge-provider-'));
    tempDirs.push(artifactRoot);

    const provider = createFakeValidateProvider();
    const progressValues: number[] = [];
    const context = createContext(artifactRoot, (progress) => {
      progressValues.push(progress);
    });

    await provider.initialize(context);
    const result = await provider.execute(context);
    await provider.validate(result);

    expect(Object.keys(result.artifacts)).toHaveLength(1);
    expect(progressValues.at(-1)).toBe(100);
  }, 15_000);
});
