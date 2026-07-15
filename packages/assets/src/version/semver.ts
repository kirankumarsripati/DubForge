const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

export function parseVersion(
  version: string,
): readonly [number, number, number, string | null] | null {
  const match = VERSION_PATTERN.exec(version);
  if (match === null) {
    return null;
  }

  return [
    Number.parseInt(match[1] ?? '0', 10),
    Number.parseInt(match[2] ?? '0', 10),
    Number.parseInt(match[3] ?? '0', 10),
    match[4] ?? null,
  ];
}

export function compare(left: string, right: string): number {
  const leftParsed = parseVersion(left);
  const rightParsed = parseVersion(right);

  if (leftParsed === null || rightParsed === null) {
    return left.localeCompare(right);
  }

  for (let index = 0; index < 3; index += 1) {
    const leftPart = leftParsed[index] as number;
    const rightPart = rightParsed[index] as number;
    const diff = leftPart - rightPart;
    if (diff !== 0) {
      return diff;
    }
  }

  const leftPrerelease = leftParsed[3];
  const rightPrerelease = rightParsed[3];

  if (leftPrerelease === null && rightPrerelease === null) {
    return 0;
  }

  if (leftPrerelease === null) {
    return 1;
  }

  if (rightPrerelease === null) {
    return -1;
  }

  return leftPrerelease.localeCompare(rightPrerelease);
}

export function satisfies(version: string, requirement: string): boolean {
  if (requirement.startsWith('^')) {
    const base = requirement.slice(1);
    const baseParsed = parseVersion(base);
    const versionParsed = parseVersion(version);
    if (baseParsed === null || versionParsed === null) {
      return false;
    }

    if (compare(version, base) < 0) {
      return false;
    }

    const upperMajor = baseParsed[0] + 1;
    const upperBound = `${String(upperMajor)}.0.0`;
    return compare(version, upperBound) < 0;
  }

  if (requirement.startsWith('>=')) {
    return compare(version, requirement.slice(2)) >= 0;
  }

  if (requirement.startsWith('<=')) {
    return compare(version, requirement.slice(2)) <= 0;
  }

  if (requirement.startsWith('>')) {
    return compare(version, requirement.slice(1)) > 0;
  }

  if (requirement.startsWith('<')) {
    return compare(version, requirement.slice(1)) < 0;
  }

  return compare(version, requirement) === 0;
}
