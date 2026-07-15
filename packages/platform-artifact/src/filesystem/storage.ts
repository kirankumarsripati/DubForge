import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { ArtifactSink } from '../types.js';

export class FilesystemArtifactStorage implements ArtifactSink {
  async writeText(path: string, content: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf8');
  }

  async readText(path: string): Promise<string> {
    return readFile(path, 'utf8');
  }

  async getSizeBytes(path: string): Promise<number> {
    const fileStat = await stat(path);
    return fileStat.size;
  }

  async computeChecksum(path: string): Promise<string> {
    const content = await readFile(path);
    return createHash('sha256').update(content).digest('hex');
  }
}
