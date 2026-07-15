import { join } from 'node:path';

import {
  ExecutionAdapterRegistry,
  MockExecutionAdapter,
  NodeExecutionAdapter,
  PythonExecutionAdapter,
} from '@dubforge/platform-execution-adapters';

import type { MediaExecutionAdapter } from './media-execution-adapter.js';

export function createMediaAwareAdapterRegistry(
  mediaExecutionAdapter: MediaExecutionAdapter,
): ExecutionAdapterRegistry {
  return new ExecutionAdapterRegistry([
    mediaExecutionAdapter,
    new NodeExecutionAdapter(),
    new PythonExecutionAdapter(),
    new MockExecutionAdapter(),
  ]);
}

export function resolveGoldenFixturePath(filename: string): string {
  return join(import.meta.dirname, 'golden/fixtures', filename);
}
