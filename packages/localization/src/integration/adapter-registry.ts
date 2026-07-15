import { join } from 'node:path';

import type { MediaExecutionAdapter } from '@dubforge/media';
import {
  ExecutionAdapterRegistry,
  MockExecutionAdapter,
  NodeExecutionAdapter,
  PythonExecutionAdapter,
} from '@dubforge/platform-execution-adapters';
import type { TranscriptionExecutionAdapter } from '@dubforge/transcription';

import type { LocalizationExecutionAdapter } from './localization-execution-adapter.js';

export function createPlatformAdapterRegistry(input: {
  readonly mediaExecutionAdapter: MediaExecutionAdapter;
  readonly transcriptionExecutionAdapter: TranscriptionExecutionAdapter;
  readonly localizationExecutionAdapter: LocalizationExecutionAdapter;
}): ExecutionAdapterRegistry {
  return new ExecutionAdapterRegistry([
    input.mediaExecutionAdapter,
    input.transcriptionExecutionAdapter,
    input.localizationExecutionAdapter,
    new NodeExecutionAdapter(),
    new PythonExecutionAdapter(),
    new MockExecutionAdapter(),
  ]);
}

export function resolveGoldenFixturePath(filename: string): string {
  return join(import.meta.dirname, 'golden/fixtures', filename);
}
