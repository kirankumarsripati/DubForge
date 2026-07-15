import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDomainEventBus, DELIVERY_EVENTS } from '@dubforge/platform-events';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import type { ArtifactSink } from '@dubforge/platform-execution-adapters';

import { deserializePackagingPlan } from '../../domain/packaging-plan.js';
import { createDeliveryPlatform } from '../../delivery-platform.js';
import { resolveGoldenFixturePath } from '../adapter-registry.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const baseRequest = {
  profile: 'fast' as const,
  output: {
    ...DEFAULT_OUTPUT_CONFIGURATION,
    generateTranslatedAudio: true,
    generateSubtitles: true,
    exportSrt: false,
    exportTranscript: true,
  },
  outputDirectory: '',
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

describe('Delivery golden integration', () => {
  it('verifies mux output and packages deliverables with validation', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-delivery-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'artifacts');
    const outputDirectory = join(rootPath, 'output');
    const eventBus = createDomainEventBus();
    const events: string[] = [];
    eventBus.subscribe((event) => {
      if (event.type.startsWith('delivery.')) {
        events.push(event.type);
      }
    });

    const deliveryPlatform = createDeliveryPlatform({
      rootPath: join(rootPath, 'delivery'),
      eventBus,
      useFixtureAdapters: true,
      fixtureExportPath: resolveGoldenFixturePath('golden-delivery-export.json'),
      fixtureValidationPath: resolveGoldenFixturePath('golden-delivery-validation.json'),
    });

    const artifacts = { mux: join(artifactRoot, 'muxed.mkv') };
    await mkdir(dirname(artifacts.mux), { recursive: true });
    await writeFile(artifacts.mux, 'MUX_PLACEHOLDER', 'utf8');

    const verifyResult = await deliveryPlatform.application.executeNode({
      executionId: 'exec-verify',
      workflowId: 'wf-delivery',
      jobId: 'job-delivery',
      nodeId: 'verify',
      nodeKind: 'verify',
      ...baseRequest,
      artifactRoot,
      artifacts,
      onProgress: () => undefined,
      artifactSink: createSink(),
    });

    expect(verifyResult.artifacts['verify-report']).toBeDefined();
    expect(events).toContain(DELIVERY_EVENTS.VALIDATION_COMPLETED);

    const packageResult = await deliveryPlatform.application.executeNode({
      executionId: 'exec-manifest',
      workflowId: 'wf-delivery',
      jobId: 'job-delivery',
      nodeId: 'manifest',
      nodeKind: 'manifest',
      ...baseRequest,
      outputDirectory,
      artifactRoot,
      artifacts,
      onProgress: () => undefined,
      artifactSink: createSink(),
    });

    const golden = JSON.parse(
      await readFile(resolveGoldenFixturePath('golden-delivery-package-hi.json'), 'utf8'),
    ) as {
      readonly durationMs: number;
      readonly trackCount: number;
      readonly languageTags: readonly string[];
      readonly artifactKeys: readonly string[];
    };

    const plan = deserializePackagingPlan(
      await readFile(packageResult.artifacts['packaging-plan'] ?? '', 'utf8'),
    );

    expect(plan.deliverables.length).toBeGreaterThan(0);
    for (const key of golden.artifactKeys) {
      expect(packageResult.artifacts[key]).toBeDefined();
    }

    const report = deliveryPlatform.diagnostics.buildWorkflowReport(
      deliveryPlatform.repository,
      'wf-delivery',
    );
    expect(report.deliverableCount).toBeGreaterThan(0);
    expect(events).toContain(DELIVERY_EVENTS.PACKAGING_STARTED);
    expect(events).toContain(DELIVERY_EVENTS.PACKAGING_COMPLETED);
    expect(events).toContain(DELIVERY_EVENTS.METRIC_RECORDED);

    deliveryPlatform.close();
  });
});
