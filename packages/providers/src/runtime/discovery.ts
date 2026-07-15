import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { EXTENSION_MANIFEST_FILENAME } from './constants';
import { parseExtensionManifest, validateParsedManifest } from './manifest';
import type { ExtensionDiscoveryResult } from './types';

async function isDirectory(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isDirectory();
  } catch {
    return false;
  }
}

async function discoverInDirectory(root: string): Promise<ExtensionDiscoveryResult[]> {
  const results: ExtensionDiscoveryResult[] = [];
  const manifestPath = join(root, EXTENSION_MANIFEST_FILENAME);

  try {
    const content = await readFile(manifestPath, 'utf8');
    const parsed = parseExtensionManifest(JSON.parse(content) as unknown);
    const validation = validateParsedManifest(parsed);
    if (validation.valid) {
      results.push({ manifest: parsed, sourcePath: root });
    }
  } catch {
    // No manifest at this level.
  }

  let entries: string[] = [];
  try {
    entries = await readdir(root);
  } catch {
    return results;
  }

  for (const entry of entries) {
    const entryPath = join(root, entry);
    if (await isDirectory(entryPath)) {
      const nested = await discoverInDirectory(entryPath);
      results.push(...nested);
    }
  }

  return results;
}

export async function discoverExtensions(
  roots: readonly string[],
): Promise<readonly ExtensionDiscoveryResult[]> {
  const discovered: ExtensionDiscoveryResult[] = [];

  for (const root of roots) {
    const results = await discoverInDirectory(root);
    discovered.push(...results);
  }

  const uniqueById = new Map<string, ExtensionDiscoveryResult>();
  for (const result of discovered) {
    uniqueById.set(result.manifest.id, result);
  }

  return [...uniqueById.values()];
}
