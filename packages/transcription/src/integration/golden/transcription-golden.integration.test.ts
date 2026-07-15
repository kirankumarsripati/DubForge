import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDomainEventBus, TRANSCRIPTION_EVENTS } from '@dubforge/platform-events';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import type { ArtifactSink } from '@dubforge/platform-execution-adapters';

import { createTranscriptionPlatform } from '../../transcription-platform.js';
import { resolveGoldenFixturePath } from '../adapter-registry.js';
import { deserializeCanonicalTranscript } from '../../domain/canonical-transcript.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const baseRequest = {
  profile: 'fast' as const,
  output: {
    ...DEFAULT_OUTPUT_CONFIGURATION,
    generateTranslatedAudio: false,
    generateSubtitles: false,
    exportSrt: false,
  },
  outputDirectory: '/tmp/output',
  signal: new AbortController().signal,
  languageCode: null,
  videoPath: '/fixtures/sample.mp4',
  videoFilename: 'sample.mp4',
  durationSeconds: 5,
};

function createSink(): ArtifactSink {
  return {
    writeText: async (path: string, content: string): Promise<void> => {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, 'utf8');
    },
  };
}

describe('Transcription golden integration', () => {
  it('maps faster-whisper output into canonical transcript artifacts', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-transcription-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'artifacts');
    const eventBus = createDomainEventBus();
    const events: string[] = [];
    eventBus.subscribe((event) => {
      if (event.type.startsWith('transcription.')) {
        events.push(event.type);
      }
    });

    const platform = createTranscriptionPlatform({
      rootPath,
      eventBus,
      useFixtureAdapters: true,
      fixtureRecognizePath: resolveGoldenFixturePath('golden-faster-whisper.json'),
    });

    const result = await platform.application.executeNode({
      executionId: 'exec-recognize',
      workflowId: 'wf-transcription',
      jobId: 'job-transcription',
      nodeId: 'speech-recognition',
      nodeKind: 'speech-recognition',
      ...baseRequest,
      artifactRoot,
      artifacts: { 'extract-audio-audio.wav': `${artifactRoot}/extract-audio-audio.wav` },
      onProgress: () => undefined,
      artifactSink: createSink(),
    });

    const golden = JSON.parse(
      await readFile(resolveGoldenFixturePath('golden-canonical-transcript.json'), 'utf8'),
    ) as {
      readonly segmentCount: number;
      readonly segments: readonly { readonly text: string }[];
    };

    const canonical = platform.repository.getCanonicalTranscript('wf-transcription', 'en');
    const artifact = deserializeCanonicalTranscript(
      await readFile(result.artifacts['canonical-transcript'] ?? '', 'utf8'),
    );

    expect(canonical?.segments).toHaveLength(golden.segmentCount);
    expect(artifact.segments[0]?.text).toBe(golden.segments[0]?.text);
    expect(events).toContain(TRANSCRIPTION_EVENTS.RECOGNIZED);
    expect(events).toContain(TRANSCRIPTION_EVENTS.ARTIFACT_PRODUCED);

    platform.close();
  });

  it('builds english transcript and localized canonical transcript from repository only', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-transcription-flow-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'artifacts');
    const eventBus = createDomainEventBus();

    const platform = createTranscriptionPlatform({
      rootPath,
      eventBus,
      useFixtureAdapters: true,
      fixtureRecognizePath: resolveGoldenFixturePath('golden-faster-whisper.json'),
    });

    const sink = createSink();

    await platform.application.executeNode({
      executionId: 'exec-recognize',
      workflowId: 'wf-flow',
      jobId: 'job-flow',
      nodeId: 'speech-recognition',
      nodeKind: 'speech-recognition',
      ...baseRequest,
      artifactRoot,
      artifacts: { 'extract-audio-audio.wav': `${artifactRoot}/extract-audio-audio.wav` },
      onProgress: () => undefined,
      artifactSink: sink,
    });

    const buildResult = await platform.application.executeNode({
      executionId: 'exec-build',
      workflowId: 'wf-flow',
      jobId: 'job-flow',
      nodeId: 'english-transcript',
      nodeKind: 'english-transcript',
      ...baseRequest,
      artifactRoot,
      artifacts: {},
      onProgress: () => undefined,
      artifactSink: sink,
    });

    expect(buildResult.artifacts.englishTranscript).toBeDefined();

    const translateResult = await platform.application.executeNode({
      executionId: 'exec-translate',
      workflowId: 'wf-flow',
      jobId: 'job-flow',
      nodeId: 'translate:hi',
      nodeKind: 'translate',
      ...baseRequest,
      languageCode: 'hi',
      artifactRoot,
      artifacts: {},
      onProgress: () => undefined,
      artifactSink: sink,
    });

    const localized = platform.repository.getCanonicalTranscript('wf-flow', 'hi');
    const localizedArtifact = deserializeCanonicalTranscript(
      await readFile(translateResult.artifacts['canonical-transcript:hi'] ?? '', 'utf8'),
    );

    expect(localized?.languageCode).toBe('hi');
    expect(localizedArtifact.languageCode).toBe('hi');
    expect(localizedArtifact.segments[0]?.text.startsWith('[hi]')).toBe(true);

    const report = platform.diagnostics.buildWorkflowReport(platform.repository, 'wf-flow');
    expect(report.englishTranscriptFound).toBe(true);
    expect(report.operations.completed).toBe(3);

    platform.close();
  });
});
