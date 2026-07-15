import type { ExtensionRuntime } from '../runtime/types';
import { createExtensionRuntime } from '../runtime/runtime';
import { loadFakePipelineExtension } from './builtin/fake-pipeline';

export async function loadBuiltinExtensions(runtime: ExtensionRuntime): Promise<void> {
  await loadFakePipelineExtension(runtime);
}

export async function createConfiguredExtensionRuntime(): Promise<ExtensionRuntime> {
  const runtime = createExtensionRuntime();
  await loadBuiltinExtensions(runtime);
  return runtime;
}
