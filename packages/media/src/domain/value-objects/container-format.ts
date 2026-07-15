export interface ContainerFormat {
  readonly name: string;
}

export function createContainerFormat(name: string): ContainerFormat {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Container format must not be empty.');
  }

  return { name: trimmed };
}

export function primaryContainerFormat(formatNames: string): ContainerFormat {
  const primary = formatNames.split(',')[0]?.trim();
  if (primary === undefined || primary.length === 0) {
    throw new Error('Container format is missing from probe result.');
  }

  return createContainerFormat(primary);
}
