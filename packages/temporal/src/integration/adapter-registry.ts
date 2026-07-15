import { join } from 'node:path';

import type { MediaExecutionAdapter } from '@dubforge/media';
import type { LocalizationExecutionAdapter } from '@dubforge/localization';
import {
  ExecutionAdapterRegistry,
  MockExecutionAdapter,
  NodeExecutionAdapter,
  PythonExecutionAdapter,
} from '@dubforge/platform-execution-adapters';
import type { TranscriptionExecutionAdapter } from '@dubforge/transcription';
import type { VoicePerformanceExecutionAdapter } from '@dubforge/voice-performance';

import type { TemporalExecutionAdapter } from './temporal-execution-adapter.js';

export function createPlatformAdapterRegistry(input: {
  readonly mediaExecutionAdapter: MediaExecutionAdapter;
  readonly transcriptionExecutionAdapter: TranscriptionExecutionAdapter;
  readonly localizationExecutionAdapter: LocalizationExecutionAdapter;
  readonly voicePerformanceExecutionAdapter: VoicePerformanceExecutionAdapter;
  readonly temporalExecutionAdapter: TemporalExecutionAdapter;
}): ExecutionAdapterRegistry {
  return new ExecutionAdapterRegistry([
    input.mediaExecutionAdapter,
    input.transcriptionExecutionAdapter,
    input.localizationExecutionAdapter,
    input.voicePerformanceExecutionAdapter,
    input.temporalExecutionAdapter,
    new NodeExecutionAdapter(),
    new PythonExecutionAdapter(),
    new MockExecutionAdapter(),
  ]);
}

export function resolveGoldenFixturePath(filename: string): string {
  return join(import.meta.dirname, 'golden/fixtures', filename);
}
