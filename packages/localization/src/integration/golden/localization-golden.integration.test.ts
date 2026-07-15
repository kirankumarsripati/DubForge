import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDomainEventBus, LOCALIZATION_EVENTS } from '@dubforge/platform-events';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import { createTranscriptionPlatform } from '@dubforge/transcription';
import { deserializeLocalizedDocument } from '../../domain/localized-document.js';
import {
  createLocalizationPlatform,
  createTranscriptReaderFromRepository,
} from '../../localization-platform.js';
import { resolveGoldenFixturePath } from '../adapter-registry.js';
import { seedEnglishCanonicalTranscript } from './test-helpers.js';

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

describe('Localization golden integration', () => {
  it('maps seamless output into localized documents with preserved segment timing', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-localization-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'artifacts');
    const eventBus = createDomainEventBus();
    const events: string[] = [];
    eventBus.subscribe((event) => {
      if (event.type.startsWith('localization.')) {
        events.push(event.type);
      }
    });

    const transcriptionPlatform = createTranscriptionPlatform({
      rootPath: join(rootPath, 'transcription'),
      eventBus,
      useFixtureAdapters: true,
    });

    seedEnglishCanonicalTranscript({
      platform: transcriptionPlatform,
      workflowId: 'wf-localization',
      jobId: 'job-localization',
    });

    const localizationPlatform = createLocalizationPlatform({
      rootPath: join(rootPath, 'localization'),
      eventBus,
      useFixtureAdapters: true,
      fixtureTranslatePath: resolveGoldenFixturePath('golden-seamless-hi.json'),
      transcriptReader: createTranscriptReaderFromRepository(transcriptionPlatform.repository),
    });

    const result = await localizationPlatform.application.executeNode({
      executionId: 'exec-translate',
      workflowId: 'wf-localization',
      jobId: 'job-localization',
      nodeId: 'translate:hi',
      nodeKind: 'translate',
      ...baseRequest,
      languageCode: 'hi',
      artifactRoot,
      artifacts: {},
      onProgress: () => undefined,
      artifactSink: createSink(),
    });

    const golden = JSON.parse(
      await readFile(resolveGoldenFixturePath('golden-localized-hi.json'), 'utf8'),
    ) as {
      readonly segmentCount: number;
      readonly segments: readonly {
        readonly id: string;
        readonly startMs: number;
        readonly endMs: number;
        readonly text: string;
      }[];
    };

    const stored = localizationPlatform.repository.getLocalizedDocument('wf-localization', 'hi');
    const artifact = deserializeLocalizedDocument(
      await readFile(result.artifacts['localized-document:hi'] ?? '', 'utf8'),
    );

    expect(stored?.segments).toHaveLength(golden.segmentCount);
    expect(artifact.segments[0]?.id).toBe(golden.segments[0]?.id);
    expect(artifact.segments[0]?.startMs).toBe(golden.segments[0]?.startMs);
    expect(artifact.segments[0]?.endMs).toBe(golden.segments[0]?.endMs);
    expect(artifact.segments[0]?.text).toBe(golden.segments[0]?.text);
    expect(events).toContain(LOCALIZATION_EVENTS.DOCUMENT_LOCALIZED);
    expect(events).toContain(LOCALIZATION_EVENTS.ARTIFACT_PRODUCED);

    transcriptionPlatform.close();
    localizationPlatform.close();
  });

  it('localizes multiple target languages in parallel from canonical transcript only', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-localization-parallel-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'artifacts');
    const eventBus = createDomainEventBus();

    const transcriptionPlatform = createTranscriptionPlatform({
      rootPath: join(rootPath, 'transcription'),
      eventBus,
      useFixtureAdapters: true,
    });

    seedEnglishCanonicalTranscript({
      platform: transcriptionPlatform,
      workflowId: 'wf-parallel',
      jobId: 'job-parallel',
    });

    const localizationPlatform = createLocalizationPlatform({
      rootPath: join(rootPath, 'localization'),
      eventBus,
      useFixtureAdapters: true,
      fixtureTranslatePath: resolveGoldenFixturePath('golden-seamless-hi.json'),
      transcriptReader: createTranscriptReaderFromRepository(transcriptionPlatform.repository),
    });

    const sink = createSink();
    const languages = ['hi', 'es'] as const;

    await Promise.all(
      languages.map((languageCode) =>
        localizationPlatform.application.executeNode({
          executionId: `exec-translate-${languageCode}`,
          workflowId: 'wf-parallel',
          jobId: 'job-parallel',
          nodeId: `translate:${languageCode}`,
          nodeKind: 'translate',
          ...baseRequest,
          languageCode,
          artifactRoot,
          artifacts: {},
          onProgress: () => undefined,
          artifactSink: sink,
        }),
      ),
    );

    const hiDocument = localizationPlatform.repository.getLocalizedDocument('wf-parallel', 'hi');
    const esDocument = localizationPlatform.repository.getLocalizedDocument('wf-parallel', 'es');

    expect(hiDocument?.targetLanguageCode).toBe('hi');
    expect(esDocument?.targetLanguageCode).toBe('es');
    expect(hiDocument?.segments[0]?.id).toBe(esDocument?.segments[0]?.id);

    const report = localizationPlatform.diagnostics.buildWorkflowReport(
      localizationPlatform.repository,
      'wf-parallel',
    );
    expect(report.localizedLanguages).toEqual(expect.arrayContaining(['hi', 'es']));
    expect(report.operations.completed).toBe(2);

    transcriptionPlatform.close();
    localizationPlatform.close();
  });
});
