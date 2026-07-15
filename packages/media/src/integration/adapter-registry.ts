import { join } from 'node:path';

import {
  ExecutionAdapterRegistry,
  MockExecutionAdapter,
  NativeBinaryExecutionAdapter,
  NodeExecutionAdapter,
  PythonExecutionAdapter,
} from '@dubforge/platform-execution-adapters';

import type { MediaExecutionAdapter } from './media-execution-adapter.js';

export interface MediaAwareAdapterRegistryOptions {
  readonly ffmpegPath?: string;
  readonly ffprobePath?: string;
}

export function createMediaAwareAdapterRegistry(
  mediaExecutionAdapter: MediaExecutionAdapter,
  options: MediaAwareAdapterRegistryOptions = {},
): ExecutionAdapterRegistry {
  return new ExecutionAdapterRegistry([
    mediaExecutionAdapter,
    new NativeBinaryExecutionAdapter({
      ffmpegPath: options.ffmpegPath,
      ffprobePath: options.ffprobePath,
    }),
    new NodeExecutionAdapter(),
    new PythonExecutionAdapter(),
    new MockExecutionAdapter(),
  ]);
}

export function resolveGoldenFixturePath(filename: string): string {
  return join(import.meta.dirname, 'golden/fixtures', filename);
}
