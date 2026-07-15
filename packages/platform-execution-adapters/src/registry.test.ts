import { describe, expect, it } from 'vitest';

import { MockExecutionAdapter } from './mock/mock-adapter.js';
import { createDefaultAdapterRegistry } from './registry.js';
import type { ExecutionAdapterRequest } from './types.js';

function createRequest(nodeKind: ExecutionAdapterRequest['nodeKind']): ExecutionAdapterRequest {
  return {
    executionId: 'exec-1',
    workflowId: 'wf-1',
    jobId: 'job-1',
    nodeId: 'node-1',
    nodeKind,
    languageCode: null,
    videoPath: '/tmp/video.mp4',
    videoFilename: 'video.mp4',
    durationSeconds: 10,
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
    onProgress: () => undefined,
  };
}

describe('ExecutionAdapterRegistry', () => {
  it('resolves node adapter for validate nodes', () => {
    const registry = createDefaultAdapterRegistry();
    const adapter = registry.resolve(createRequest('validate'));
    expect(adapter.kind).toBe('node');
  });

  it('resolves mock adapter as fallback', () => {
    const registry = createDefaultAdapterRegistry();
    const adapter = registry.resolve(createRequest('fingerprint'));
    expect(adapter.kind).toBe('mock');
  });

  it('executes mock adapter with progress', async () => {
    const adapter = new MockExecutionAdapter();
    const progress: number[] = [];
    const request = {
      ...createRequest('validate'),
      onProgress: (value: number) => {
        progress.push(value);
      },
    };

    const result = await adapter.execute(request);
    expect(result.artifacts.validate).toContain('node-1.json');
    expect(progress.length).toBeGreaterThan(0);
  });
});
