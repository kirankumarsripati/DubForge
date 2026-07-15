import { compare, satisfies } from './semver.js';

export interface VersionRange {
  readonly min?: string;
  readonly max?: string;
  readonly exact?: string;
}

export class VersionManager {
  isNewer(candidate: string, current: string): boolean {
    return compare(candidate, current) > 0;
  }

  isCompatible(installed: string, required: string): boolean {
    return satisfies(installed, required);
  }

  selectLatest(versions: readonly string[]): string | null {
    if (versions.length === 0) {
      return null;
    }

    return versions.reduce((latest, version) => {
      return compare(version, latest) > 0 ? version : latest;
    });
  }

  findBestMatch(available: readonly string[], range: VersionRange): string | null {
    const candidates = available.filter((version) => this.matchesRange(version, range));
    return this.selectLatest(candidates);
  }

  private matchesRange(version: string, range: VersionRange): boolean {
    if (range.exact !== undefined) {
      return compare(version, range.exact) === 0;
    }

    if (range.min !== undefined && compare(version, range.min) < 0) {
      return false;
    }

    if (range.max !== undefined && compare(version, range.max) > 0) {
      return false;
    }

    return true;
  }
}
