import { describe, expect, it } from 'vitest';
import { CapabilityNotFoundError, ExtensionRegistry } from './registry';
import { PIPELINE_STAGE_CAPABILITY } from '../capabilities/pipeline-stage';

describe('ExtensionRegistry', () => {
  it('registers and resolves capabilities', () => {
    const registry = new ExtensionRegistry();

    registry.registerExtension({
      manifest: {
        manifestVersion: '1.0.0',
        id: 'test.extension',
        name: 'Test',
        version: '1.0.0',
        description: 'Test extension',
        runtimeVersion: '>=0.1.0',
        kind: 'builtin',
        capabilities: [{ id: 'stage.validate', type: PIPELINE_STAGE_CAPABILITY, key: 'validate' }],
      },
      kind: 'builtin',
      sourcePath: null,
      loadedAt: new Date().toISOString(),
      capabilities: [{ id: 'stage.validate', type: PIPELINE_STAGE_CAPABILITY, key: 'validate' }],
    });

    const handler = {
      initialize: () => Promise.resolve(),
      execute: () => Promise.resolve({ artifacts: {}, durationMs: 1 }),
      validate: () => Promise.resolve(),
      cleanup: () => Promise.resolve(),
    };

    registry.registerCapability(
      'test.extension',
      { id: 'stage.validate', type: PIPELINE_STAGE_CAPABILITY, key: 'validate' },
      handler,
    );

    expect(registry.hasCapability(PIPELINE_STAGE_CAPABILITY, 'validate')).toBe(true);
    expect(registry.resolveCapability(PIPELINE_STAGE_CAPABILITY, 'validate').handler).toBe(handler);
  });

  it('throws when capability is missing', () => {
    const registry = new ExtensionRegistry();
    expect(() => registry.resolveCapability(PIPELINE_STAGE_CAPABILITY, 'validate')).toThrow(
      CapabilityNotFoundError,
    );
  });
});
