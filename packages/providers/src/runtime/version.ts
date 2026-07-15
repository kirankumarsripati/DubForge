import { EXTENSION_RUNTIME_VERSION } from './constants';

interface ParsedVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

function parseVersion(version: string): ParsedVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (match === null) {
    return null;
  }

  const major = match[1];
  const minor = match[2];
  const patch = match[3];
  if (major === undefined || minor === undefined || patch === undefined) {
    return null;
  }

  return {
    major: Number.parseInt(major, 10),
    minor: Number.parseInt(minor, 10),
    patch: Number.parseInt(patch, 10),
  };
}

function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  return left.patch - right.patch;
}

export interface VersionCompatibilityResult {
  readonly compatible: boolean;
  readonly reason: string | null;
}

export function checkRuntimeCompatibility(
  runtimeVersionConstraint: string,
): VersionCompatibilityResult {
  const runtimeVersion = parseVersion(EXTENSION_RUNTIME_VERSION);
  if (runtimeVersion === null) {
    return {
      compatible: false,
      reason: `Current runtime version "${EXTENSION_RUNTIME_VERSION}" is invalid.`,
    };
  }

  const greaterOrEqualMatch = /^>=\s*(\d+\.\d+\.\d+)$/.exec(runtimeVersionConstraint.trim());
  if (greaterOrEqualMatch !== null) {
    const minimum = greaterOrEqualMatch[1];
    if (minimum === undefined) {
      return { compatible: false, reason: 'Invalid runtime version constraint.' };
    }

    const minimumVersion = parseVersion(minimum);
    if (minimumVersion === null) {
      return {
        compatible: false,
        reason: `Extension runtime constraint "${runtimeVersionConstraint}" is invalid.`,
      };
    }

    const compatible = compareVersions(runtimeVersion, minimumVersion) >= 0;
    return {
      compatible,
      reason: compatible
        ? null
        : `Extension requires runtime ${runtimeVersionConstraint}, but current runtime is ${EXTENSION_RUNTIME_VERSION}.`,
    };
  }

  const exactVersion = parseVersion(runtimeVersionConstraint.trim());
  if (exactVersion !== null) {
    const compatible = compareVersions(runtimeVersion, exactVersion) === 0;
    return {
      compatible,
      reason: compatible
        ? null
        : `Extension requires runtime ${runtimeVersionConstraint}, but current runtime is ${EXTENSION_RUNTIME_VERSION}.`,
    };
  }

  return {
    compatible: false,
    reason: `Unsupported runtime version constraint "${runtimeVersionConstraint}".`,
  };
}
