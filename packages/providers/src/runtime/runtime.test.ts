import { describe, expect, it } from 'vitest';
import { NODE_KINDS } from '@dubforge/types';
import {
  PIPELINE_STAGE_CAPABILITY,
  createConfiguredExtensionRuntime,
  fakePipelineExtensionManifest,
} from '../index';

describe('ExtensionRuntime', () => {
  it('loads built-in fake pipeline extension and resolves stage capabilities', async () => {
    const runtime = await createConfiguredExtensionRuntime();

    const extensions = runtime.listExtensions();
    expect(extensions).toHaveLength(1);
    expect(extensions[0]?.manifest.id).toBe(fakePipelineExtensionManifest.id);

    expect(runtime.hasCapability(PIPELINE_STAGE_CAPABILITY, NODE_KINDS.VALIDATE)).toBe(true);
    expect(runtime.hasCapability(PIPELINE_STAGE_CAPABILITY, NODE_KINDS.MANIFEST)).toBe(true);

    const handler = runtime.resolveCapability(PIPELINE_STAGE_CAPABILITY, NODE_KINDS.VALIDATE);
    expect(typeof handler.execute).toBe('function');
  });

  it('reports healthy built-in extensions', async () => {
    const runtime = await createConfiguredExtensionRuntime();
    const reports = await runtime.getHealthReports();

    expect(reports).toHaveLength(1);
    expect(reports[0]?.status).toBe('healthy');
    expect(reports[0]?.extensionId).toBe(fakePipelineExtensionManifest.id);
  });
});
