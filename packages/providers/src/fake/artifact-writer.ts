import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export async function writePlaceholderArtifact(
  artifactRoot: string,
  relativePath: string,
  content: string,
): Promise<string> {
  const absolutePath = join(artifactRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
  return absolutePath;
}

export function createPlaceholderJson(label: string, details: Record<string, unknown>): string {
  return JSON.stringify(
    {
      placeholder: true,
      label,
      generatedAt: new Date().toISOString(),
      ...details,
    },
    null,
    2,
  );
}
