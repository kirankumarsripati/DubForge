import type { ExtensionRuntime } from '../../../runtime/types';
import { fakePipelineExtensionModule } from './activate';
import { fakePipelineExtensionManifest } from './manifest';

export async function loadFakePipelineExtension(runtime: ExtensionRuntime): Promise<void> {
  await runtime.loadBuiltin(fakePipelineExtensionManifest, fakePipelineExtensionModule);
}
