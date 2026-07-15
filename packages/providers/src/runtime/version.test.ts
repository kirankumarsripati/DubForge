import { describe, expect, it } from 'vitest';
import { checkRuntimeCompatibility } from './version';

describe('checkRuntimeCompatibility', () => {
  it('accepts compatible minimum runtime versions', () => {
    const result = checkRuntimeCompatibility('>=0.1.0');
    expect(result.compatible).toBe(true);
  });

  it('rejects incompatible minimum runtime versions', () => {
    const result = checkRuntimeCompatibility('>=9.9.9');
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('requires runtime');
  });

  it('rejects unsupported constraints', () => {
    const result = checkRuntimeCompatibility('~0.1.0');
    expect(result.compatible).toBe(false);
  });
});
