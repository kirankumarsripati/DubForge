import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

function addRootIfRegistryExists(roots: string[], candidate: string): void {
  if (existsSync(join(candidate, 'registry.json'))) {
    roots.push(candidate);
  }
}

export function resolveDesktopRegistryRoots(): string[] {
  const roots: string[] = [];

  if (!app.isPackaged) {
    const appPath = app.getAppPath();
    addRootIfRegistryExists(roots, join(appPath, '../../packages/providers/dist/assets'));
    addRootIfRegistryExists(roots, join(appPath, '../../packages/providers/src/assets'));
  } else {
    addRootIfRegistryExists(roots, join(process.resourcesPath, 'asset-registry'));
  }

  return roots;
}
