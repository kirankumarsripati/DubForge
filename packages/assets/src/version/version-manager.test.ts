import { describe, expect, it } from 'vitest';

import { compare, satisfies } from './semver.js';
import { VersionManager } from './version-manager.js';

describe('semver', () => {
  it('compares semantic versions', () => {
    expect(compare('1.2.3', '1.2.4')).toBeLessThan(0);
    expect(compare('2.0.0', '1.9.9')).toBeGreaterThan(0);
    expect(compare('1.0.0', '1.0.0')).toBe(0);
  });

  it('evaluates caret ranges', () => {
    expect(satisfies('1.2.3', '^1.0.0')).toBe(true);
    expect(satisfies('2.0.0', '^1.0.0')).toBe(false);
  });
});

describe('VersionManager', () => {
  const manager = new VersionManager();

  it('selects latest version', () => {
    expect(manager.selectLatest(['1.0.0', '1.2.0', '1.1.0'])).toBe('1.2.0');
  });

  it('detects newer versions', () => {
    expect(manager.isNewer('1.1.0', '1.0.0')).toBe(true);
    expect(manager.isNewer('1.0.0', '1.1.0')).toBe(false);
  });
});
