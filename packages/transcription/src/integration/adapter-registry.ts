import { join } from 'node:path';

import type { MediaExecutionAdapter } from '@dubforge/media';
import {
  ExecutionAdapterRegistry,
  MockExecutionAdapter,
  NodeExecutionAdapter,
  PythonExecutionAdapter,
} from '@dubforge/platform-execution-adapters';

import type { TranscriptionExecutionAdapter } from './transcription-execution-adapter.js';

export function createPlatformAdapterRegistry(input: {
  readonly mediaExecutionAdapter: MediaExecutionAdapter;
  readonly transcriptionExecutionAdapter: TranscriptionExecutionAdapter;
}): ExecutionAdapterRegistry {
  return new ExecutionAdapterRegistry([
    input.mediaExecutionAdapter,
    input.transcriptionExecutionAdapter,
    new NodeExecutionAdapter(),
    new PythonExecutionAdapter(),
    new MockExecutionAdapter(),
  ]);
}

export function resolveGoldenFixturePath(filename: string): string {
  return join(import.meta.dirname, 'golden/fixtures', filename);
}
