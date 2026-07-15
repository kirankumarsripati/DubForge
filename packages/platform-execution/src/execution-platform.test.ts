import { describe, expect, it, vi } from 'vitest';

import { createDomainEventBus, EXECUTION_EVENTS } from '@dubforge/platform-events';
import {
  createDefaultAdapterRegistry,
  MockExecutionAdapter,
} from '@dubforge/platform-execution-adapters';

import { createExecutionPlatform } from './execution-platform.js';

describe('ExecutionPlatform', () => {
  it('executes nodes through adapters and publishes events', async () => {
    const eventBus = createDomainEventBus();
    const events: string[] = [];
    eventBus.subscribe((event) => {
      events.push(event.type);
    });

    const platform = createExecutionPlatform({
      eventBus,
      adapterRegistry: createDefaultAdapterRegistry(),
      defaultTimeoutMs: 5_000,
    });

    const port = platform.createNodeExecutionPort();
    const result = await port.execute({
      workflowId: 'wf-1',
      jobId: 'job-1',
      nodeId: 'node-validate',
      nodeKind: 'fingerprint',
      languageCode: null,
      videoPath: '/tmp/video.mp4',
      videoFilename: 'video.mp4',
      durationSeconds: 5,
      profile: 'fast',
      output: {
        generateTranslatedAudio: false,
        generateSubtitles: false,
        embedSubtitles: false,
        exportSrt: false,
        exportTranscript: false,
        containerFormat: 'mkv',
      },
      outputDirectory: '/tmp/output',
      artifactRoot: '/tmp/artifacts',
      artifacts: {},
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    });

    expect(result.artifacts.fingerprint).toBeDefined();
    expect(events).toContain(EXECUTION_EVENTS.REQUESTED);
    expect(events).toContain(EXECUTION_EVENTS.COMPLETED);
  });

  it('cancels active executions', async () => {
    const platform = createExecutionPlatform({
      eventBus: createDomainEventBus(),
      adapterRegistry: new (
        await import('@dubforge/platform-execution-adapters')
      ).ExecutionAdapterRegistry([new MockExecutionAdapter()]),
    });

    const controller = new AbortController();
    const promise = platform.createNodeExecutionPort().execute({
      workflowId: 'wf-1',
      jobId: 'job-1',
      nodeId: 'node-1',
      nodeKind: 'translate',
      languageCode: 'hi',
      videoPath: '/tmp/video.mp4',
      videoFilename: 'video.mp4',
      durationSeconds: 5,
      profile: 'fast',
      output: {
        generateTranslatedAudio: false,
        generateSubtitles: false,
        embedSubtitles: false,
        exportSrt: false,
        exportTranscript: false,
        containerFormat: 'mkv',
      },
      outputDirectory: '/tmp/output',
      artifactRoot: '/tmp/artifacts',
      artifacts: {},
      signal: controller.signal,
      onProgress: vi.fn(),
    });

    controller.abort();
    platform.cancelAll();
    await expect(promise).rejects.toThrow();
  });
});
