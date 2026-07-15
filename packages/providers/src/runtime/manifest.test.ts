import { describe, expect, it } from 'vitest';
import { validateExtensionManifest } from './manifest';
import { EXTENSION_MANIFEST_VERSION } from './constants';

const validManifest = {
  manifestVersion: EXTENSION_MANIFEST_VERSION,
  id: 'acme.sample',
  name: 'Sample Extension',
  version: '1.0.0',
  description: 'Sample extension for testing.',
  runtimeVersion: '>=0.1.0',
  kind: 'builtin' as const,
  capabilities: [{ id: 'stage.validate', type: 'pipeline.stage', key: 'validate' }],
};

describe('validateExtensionManifest', () => {
  it('accepts a valid manifest', () => {
    const result = validateExtensionManifest(validManifest);
    expect(result.valid).toBe(true);
  });

  it('rejects duplicate capability ids', () => {
    const result = validateExtensionManifest({
      ...validManifest,
      capabilities: [
        { id: 'stage.validate', type: 'pipeline.stage', key: 'validate' },
        { id: 'stage.validate', type: 'pipeline.stage', key: 'fingerprint' },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'duplicate-capability')).toBe(true);
  });

  it('requires entry for external extensions', () => {
    const result = validateExtensionManifest({
      ...validManifest,
      kind: 'external',
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'missing-entry')).toBe(true);
  });
});
