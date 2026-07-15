import { join } from 'node:path';

import type { NodeKind } from '@dubforge/types';

import { EXECUTION_ADAPTER_KINDS } from '../types.js';
import type {
  CancellationSignal,
  ExecutionAdapter,
  ExecutionAdapterRequest,
  ExecutionAdapterResult,
} from '../types.js';

const MOCK_STAGE_DURATIONS_MS: Readonly<Record<NodeKind, number>> = {
  validate: 50,
  fingerprint: 40,
  metadata: 40,
  'extract-audio': 80,
  'speech-recognition': 120,
  'english-transcript': 30,
  'english-subtitle': 30,
  translate: 100,
  subtitle: 60,
  speech: 150,
  align: 70,
  mux: 90,
  verify: 50,
  manifest: 30,
};

function sleep(ms: number, signal: CancellationSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('Execution cancelled'));
      return;
    }

    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('Execution cancelled'));
      },
      { once: true },
    );
  });
}

function createPlaceholderContent(nodeKind: NodeKind, request: ExecutionAdapterRequest): string {
  return JSON.stringify({
    nodeKind,
    workflowId: request.workflowId,
    nodeId: request.nodeId,
    languageCode: request.languageCode,
    generatedAt: new Date().toISOString(),
  });
}

export class MockExecutionAdapter implements ExecutionAdapter {
  readonly kind = EXECUTION_ADAPTER_KINDS.MOCK;

  canHandle(): boolean {
    return true;
  }

  async execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    const startedAt = Date.now();
    const baseDuration = MOCK_STAGE_DURATIONS_MS[request.nodeKind];
    const steps = 4;

    for (let step = 1; step <= steps; step += 1) {
      await sleep(Math.ceil(baseDuration / steps), request.signal);
      request.onProgress(Math.round((step / steps) * 100));
    }

    const artifactPath = join(request.artifactRoot, `${request.nodeId}.json`);
    const content = createPlaceholderContent(request.nodeKind, request);
    if (request.artifactSink !== undefined) {
      await request.artifactSink.writeText(artifactPath, content);
    }

    return {
      artifacts: { [request.nodeKind]: artifactPath },
      durationMs: Date.now() - startedAt,
    };
  }
}
