import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDomainEventBus, TEMPORAL_EVENTS } from '@dubforge/platform-events';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import { createLocalizationPlatform } from '@dubforge/localization';
import { createVoicePerformancePlatform } from '@dubforge/voice-performance';

import { deserializeAudioComposition } from '../../domain/audio-composition.js';
import { deserializeAlignmentPlan } from '../../domain/alignment-plan.js';
import {
  createLocalizedDocumentReaderFromRepository,
  createTemporalPlatform,
  createVoicePerformanceReaderFromRepository,
} from '../../temporal-platform.js';
import { resolveGoldenFixturePath } from '../adapter-registry.js';
import { seedLocalizedDocument, seedVoicePerformance } from './test-helpers.js';

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

describe('Temporal composition golden integration', () => {
  it('creates alignment plan before modifying audio and composes aligned layers', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-temporal-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'artifacts');
    const eventBus = createDomainEventBus();
    const events: string[] = [];
    eventBus.subscribe((event) => {
      if (event.type.startsWith('temporal.')) {
        events.push(event.type);
      }
    });

    const localizationPlatform = createLocalizationPlatform({
      rootPath: join(rootPath, 'localization'),
      eventBus,
      useFixtureAdapters: true,
      transcriptReader: { getCanonicalTranscript: () => null },
    });

    const document = seedLocalizedDocument({
      repository: localizationPlatform.repository,
      workflowId: 'wf-temporal',
      jobId: 'job-temporal',
    });

    const voicePlatform = createVoicePerformancePlatform({
      rootPath: join(rootPath, 'voice'),
      eventBus,
      useFixtureAdapters: true,
      localizedDocumentReader: createLocalizedDocumentReaderFromRepository(
        localizationPlatform.repository,
      ),
    });

    seedVoicePerformance({
      repository: voicePlatform.repository,
      workflowId: 'wf-temporal',
      jobId: 'job-temporal',
      localizedDocumentId: document.id,
      artifactRoot,
      nodeId: 'speech:hi',
    });

    const temporalPlatform = createTemporalPlatform({
      rootPath: join(rootPath, 'temporal'),
      eventBus,
      useFixtureAdapters: true,
      fixtureAlignPath: resolveGoldenFixturePath('golden-rubberband-hi.json'),
      fixtureComposePath: resolveGoldenFixturePath('golden-ffmpeg-compose-hi.json'),
      localizedDocumentReader: createLocalizedDocumentReaderFromRepository(
        localizationPlatform.repository,
      ),
      voicePerformanceReader: createVoicePerformanceReaderFromRepository(voicePlatform.repository),
    });

    const result = await temporalPlatform.application.executeNode({
      executionId: 'exec-align',
      workflowId: 'wf-temporal',
      jobId: 'job-temporal',
      nodeId: 'align:hi',
      nodeKind: 'align',
      ...baseRequest,
      languageCode: 'hi',
      artifactRoot,
      artifacts: {},
      onProgress: () => undefined,
      artifactSink: createSink(),
    });

    const golden = JSON.parse(
      await readFile(resolveGoldenFixturePath('golden-temporal-composition-hi.json'), 'utf8'),
    ) as {
      readonly segmentCount: number;
      readonly totalDurationMs: number;
      readonly segments: readonly { readonly id: string; readonly startMs: number }[];
      readonly artifactKeys: readonly string[];
    };

    const plan = deserializeAlignmentPlan(
      await readFile(result.artifacts['alignment-plan:hi'] ?? '', 'utf8'),
    );
    const composition = deserializeAudioComposition(
      await readFile(result.artifacts['audio-composition:hi'] ?? '', 'utf8'),
    );

    expect(plan.segments).toHaveLength(golden.segmentCount);
    expect(plan.segments[0]?.startMs).toBe(golden.segments[0]?.startMs);
    expect(plan.totalDurationMs).toBe(golden.totalDurationMs);
    expect(composition.durationMs).toBe(golden.totalDurationMs);
    expect(result.artifacts['aligned-segment:seg-hello']).toBeDefined();
    for (const key of golden.artifactKeys) {
      expect(result.artifacts[key]).toBeDefined();
    }
    expect(events).toContain(TEMPORAL_EVENTS.ALIGNMENT_PLANNED);
    expect(events).toContain(TEMPORAL_EVENTS.COMPOSED);
    expect(events).toContain(TEMPORAL_EVENTS.SEGMENT_ARTIFACT_REGISTERED);

    const report = temporalPlatform.diagnostics.buildWorkflowReport(
      temporalPlatform.repository,
      'wf-temporal',
    );
    expect(report.languages).toContain('hi');
    expect(report.operations.completed).toBe(1);

    localizationPlatform.close();
    voicePlatform.close();
    temporalPlatform.close();
  });
});
