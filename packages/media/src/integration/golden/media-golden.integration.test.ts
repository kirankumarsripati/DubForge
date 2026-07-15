import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDomainEventBus, MEDIA_EVENTS } from '@dubforge/platform-events';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import type { ArtifactSink } from '@dubforge/platform-execution-adapters';

import { createMediaPlatform } from '../../media-platform.js';
import { resolveGoldenFixturePath } from '../adapter-registry.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('Media domain golden integration', () => {
  it('produces probe artifacts matching the golden fixture', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-media-golden-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'artifacts');
    const eventBus = createDomainEventBus();
    const mediaEvents: string[] = [];

    eventBus.subscribe((event) => {
      if (event.type.startsWith('media.')) {
        mediaEvents.push(event.type);
      }
    });

    const platform = createMediaPlatform({
      rootPath,
      eventBus,
      useFixtureAdapters: true,
      fixtureProbePath: resolveGoldenFixturePath('golden-probe.json'),
    });

    const result = await platform.application.executeNode({
      executionId: 'exec-1',
      workflowId: 'wf-golden',
      jobId: 'job-golden',
      nodeId: 'node-metadata',
      nodeKind: 'metadata',
      languageCode: null,
      videoPath: '/fixtures/sample.mp4',
      videoFilename: 'sample.mp4',
      durationSeconds: 12.5,
      profile: 'fast',
      output: {
        ...DEFAULT_OUTPUT_CONFIGURATION,
        generateTranslatedAudio: false,
        generateSubtitles: false,
        exportSrt: false,
      },
      outputDirectory: '/tmp/output',
      artifactRoot,
      artifacts: {},
      signal: new AbortController().signal,
      onProgress: () => undefined,
      artifactSink: {
        writeText: async (path: string, content: string): Promise<void> => {
          await mkdir(dirname(path), { recursive: true });
          await writeFile(path, content, 'utf8');
        },
      },
    });

    const goldenProbe = JSON.parse(
      await readFile(resolveGoldenFixturePath('golden-probe.json'), 'utf8'),
    ) as {
      readonly width: number;
      readonly height: number;
      readonly videoCodec: string;
    };

    const mediaFile = platform.repository.findMediaFileByWorkflow('wf-golden');
    const artifactContent = JSON.parse(await readFile(result.artifacts.metadata ?? '', 'utf8')) as {
      readonly probe: {
        readonly width: number;
        readonly height: number;
        readonly videoCodec: string;
      };
    };

    expect(mediaFile?.resolution.width).toBe(goldenProbe.width);
    expect(mediaFile?.resolution.height).toBe(goldenProbe.height);
    expect(mediaFile?.videoCodec.name).toBe(goldenProbe.videoCodec);
    expect(artifactContent.probe.width).toBe(goldenProbe.width);
    expect(mediaEvents).toContain(MEDIA_EVENTS.FILE_PROBED);
    expect(mediaEvents).toContain(MEDIA_EVENTS.ARTIFACT_PRODUCED);

    const report = platform.diagnostics.buildWorkflowReport(platform.repository, 'wf-golden');
    expect(report.mediaFileFound).toBe(true);
    expect(report.operations.completed).toBe(1);

    platform.close();
  });

  it('runs extract-audio and mux operations with golden manifests', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-media-golden-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'artifacts');
    const eventBus = createDomainEventBus();

    const platform = createMediaPlatform({
      rootPath,
      eventBus,
      useFixtureAdapters: true,
      fixtureProbePath: resolveGoldenFixturePath('golden-probe.json'),
    });

    const sink: ArtifactSink = {
      writeText: async (path: string, content: string): Promise<void> => {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, 'utf8');
      },
    };

    await platform.application.executeNode({
      executionId: 'exec-probe',
      workflowId: 'wf-media-flow',
      jobId: 'job-media-flow',
      nodeId: 'node-metadata',
      nodeKind: 'metadata',
      languageCode: null,
      videoPath: '/fixtures/sample.mp4',
      videoFilename: 'sample.mp4',
      durationSeconds: 12.5,
      profile: 'fast',
      output: {
        ...DEFAULT_OUTPUT_CONFIGURATION,
        generateTranslatedAudio: false,
        generateSubtitles: false,
        exportSrt: false,
      },
      outputDirectory: '/tmp/output',
      artifactRoot,
      artifacts: {},
      signal: new AbortController().signal,
      onProgress: () => undefined,
      artifactSink: sink,
    });

    const extractResult = await platform.application.executeNode({
      executionId: 'exec-extract',
      workflowId: 'wf-media-flow',
      jobId: 'job-media-flow',
      nodeId: 'node-extract-audio',
      nodeKind: 'extract-audio',
      languageCode: null,
      videoPath: '/fixtures/sample.mp4',
      videoFilename: 'sample.mp4',
      durationSeconds: 12.5,
      profile: 'fast',
      output: {
        ...DEFAULT_OUTPUT_CONFIGURATION,
        generateTranslatedAudio: false,
        generateSubtitles: false,
        exportSrt: false,
      },
      outputDirectory: '/tmp/output',
      artifactRoot,
      artifacts: {},
      signal: new AbortController().signal,
      onProgress: () => undefined,
      artifactSink: sink,
    });

    const goldenExtract = JSON.parse(
      await readFile(resolveGoldenFixturePath('golden-extract-audio.json'), 'utf8'),
    ) as { readonly codec: string; readonly sampleRate: number };

    const extractManifest = JSON.parse(
      await readFile(extractResult.artifacts['extract-audio-manifest'] ?? '', 'utf8'),
    ) as { readonly codec: string; readonly sampleRate: number };

    expect(extractManifest.codec).toBe(goldenExtract.codec);
    expect(extractManifest.sampleRate).toBe(goldenExtract.sampleRate);

    const muxResult = await platform.application.executeNode({
      executionId: 'exec-mux',
      workflowId: 'wf-media-flow',
      jobId: 'job-media-flow',
      nodeId: 'node-mux',
      nodeKind: 'mux',
      languageCode: null,
      videoPath: '/fixtures/sample.mp4',
      videoFilename: 'sample.mp4',
      durationSeconds: 12.5,
      profile: 'fast',
      output: {
        ...DEFAULT_OUTPUT_CONFIGURATION,
        generateTranslatedAudio: false,
        generateSubtitles: false,
        exportSrt: false,
      },
      outputDirectory: '/tmp/output',
      artifactRoot,
      artifacts: extractResult.artifacts,
      signal: new AbortController().signal,
      onProgress: () => undefined,
      artifactSink: sink,
    });

    const goldenMux = JSON.parse(
      await readFile(resolveGoldenFixturePath('golden-mux.json'), 'utf8'),
    ) as { readonly videoCodec: string; readonly audioCodec: string };

    const muxManifest = JSON.parse(
      await readFile(muxResult.artifacts['mux-manifest'] ?? '', 'utf8'),
    ) as { readonly videoCodec: string; readonly audioCodec: string };

    expect(muxManifest.videoCodec).toBe(goldenMux.videoCodec);
    expect(muxManifest.audioCodec).toBe(goldenMux.audioCodec);

    const operations = platform.repository.listOperationsByWorkflow('wf-media-flow');
    expect(operations).toHaveLength(3);

    platform.close();
  });
});
