import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDomainEventBus, VOICE_PERFORMANCE_EVENTS } from '@dubforge/platform-events';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import { createLocalizationPlatform } from '@dubforge/localization';
import { createTranscriptionPlatform } from '@dubforge/transcription';
import { createTranscriptReaderFromRepository } from '@dubforge/localization';

import { deserializeVoicePerformance } from '../../domain/voice-performance.js';
import {
  createLocalizedDocumentReaderFromRepository,
  createVoicePerformancePlatform,
} from '../../voice-performance-platform.js';
import { resolveGoldenFixturePath } from '../adapter-registry.js';
import { seedLocalizedDocument } from './test-helpers.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const baseRequest = {
  profile: 'fast' as const,
  output: {
    ...DEFAULT_OUTPUT_CONFIGURATION,
    generateTranslatedAudio: true,
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

describe('Voice performance golden integration', () => {
  it('synthesizes one audio segment per transcript segment with preserved timing', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-voice-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'artifacts');
    const eventBus = createDomainEventBus();
    const events: string[] = [];
    eventBus.subscribe((event) => {
      if (event.type.startsWith('voice-performance.')) {
        events.push(event.type);
      }
    });

    const transcriptionPlatform = createTranscriptionPlatform({
      rootPath: join(rootPath, 'transcription'),
      eventBus,
      useFixtureAdapters: true,
    });

    const localizationPlatform = createLocalizationPlatform({
      rootPath: join(rootPath, 'localization'),
      eventBus,
      useFixtureAdapters: true,
      transcriptReader: createTranscriptReaderFromRepository(transcriptionPlatform.repository),
    });

    seedLocalizedDocument({
      repository: localizationPlatform.repository,
      workflowId: 'wf-voice',
      jobId: 'job-voice',
    });

    const voicePlatform = createVoicePerformancePlatform({
      rootPath: join(rootPath, 'voice'),
      eventBus,
      useFixtureAdapters: true,
      fixtureSynthesisPath: resolveGoldenFixturePath('golden-kokoro-hi.json'),
      localizedDocumentReader: createLocalizedDocumentReaderFromRepository(
        localizationPlatform.repository,
      ),
    });

    const result = await voicePlatform.application.executeNode({
      executionId: 'exec-speech',
      workflowId: 'wf-voice',
      jobId: 'job-voice',
      nodeId: 'speech:hi',
      nodeKind: 'speech',
      ...baseRequest,
      languageCode: 'hi',
      artifactRoot,
      artifacts: {},
      onProgress: () => undefined,
      artifactSink: createSink(),
    });

    const golden = JSON.parse(
      await readFile(resolveGoldenFixturePath('golden-voice-performance-hi.json'), 'utf8'),
    ) as {
      readonly segmentCount: number;
      readonly segments: readonly { readonly id: string; readonly startMs: number }[];
    };

    const stored = voicePlatform.repository.getVoicePerformance('wf-voice', 'hi');
    const manifest = deserializeVoicePerformance(
      await readFile(result.artifacts['voice-performance:hi'] ?? '', 'utf8'),
    );

    expect(stored?.segments).toHaveLength(golden.segmentCount);
    expect(manifest.segments[0]?.id).toBe(golden.segments[0]?.id);
    expect(manifest.segments[0]?.startMs).toBe(golden.segments[0]?.startMs);
    expect(result.artifacts['segment-audio:seg-hello']).toBeDefined();
    expect(events).toContain(VOICE_PERFORMANCE_EVENTS.SYNTHESIZED);
    expect(events).toContain(VOICE_PERFORMANCE_EVENTS.SEGMENT_ARTIFACT_REGISTERED);

    transcriptionPlatform.close();
    localizationPlatform.close();
    voicePlatform.close();
  });

  it('supports parallel synthesis across languages', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-voice-parallel-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'artifacts');
    const eventBus = createDomainEventBus();

    const localizationPlatform = createLocalizationPlatform({
      rootPath: join(rootPath, 'localization'),
      eventBus,
      useFixtureAdapters: true,
      transcriptReader: {
        getCanonicalTranscript: () => null,
      },
    });

    seedLocalizedDocument({
      repository: localizationPlatform.repository,
      workflowId: 'wf-voice-parallel',
      jobId: 'job-voice-parallel',
      languageCode: 'hi',
    });
    seedLocalizedDocument({
      repository: localizationPlatform.repository,
      workflowId: 'wf-voice-parallel',
      jobId: 'job-voice-parallel',
      languageCode: 'es',
      segments: [
        {
          id: 'seg-hello',
          startMs: 0,
          endMs: 2500,
          sourceText: 'Hello world.',
          text: 'Hola mundo.',
        },
        {
          id: 'seg-golden',
          startMs: 2500,
          endMs: 5000,
          sourceText: 'This is a golden transcript.',
          text: 'Este es un transcripto dorado.',
        },
      ],
    });

    const voicePlatform = createVoicePerformancePlatform({
      rootPath: join(rootPath, 'voice'),
      eventBus,
      useFixtureAdapters: true,
      fixtureSynthesisPath: resolveGoldenFixturePath('golden-kokoro-hi.json'),
      localizedDocumentReader: createLocalizedDocumentReaderFromRepository(
        localizationPlatform.repository,
      ),
    });

    const sink = createSink();
    const languages = ['hi', 'es'] as const;

    await Promise.all(
      languages.map((languageCode) =>
        voicePlatform.application.executeNode({
          executionId: `exec-speech-${languageCode}`,
          workflowId: 'wf-voice-parallel',
          jobId: 'job-voice-parallel',
          nodeId: `speech:${languageCode}`,
          nodeKind: 'speech',
          ...baseRequest,
          languageCode,
          artifactRoot,
          artifacts: {},
          onProgress: () => undefined,
          artifactSink: sink,
        }),
      ),
    );

    const report = voicePlatform.diagnostics.buildWorkflowReport(
      voicePlatform.repository,
      'wf-voice-parallel',
    );
    expect(report.languages).toEqual(expect.arrayContaining(['hi', 'es']));
    expect(report.operations.completed).toBeGreaterThanOrEqual(2);

    localizationPlatform.close();
    voicePlatform.close();
  });
});
