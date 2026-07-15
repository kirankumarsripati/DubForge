import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { MAX_RECENT_VIDEO_FILES } from '@dubforge/shared';

interface StoredRecentVideoFile {
  readonly id: string;
  readonly filePath: string;
  readonly filename: string;
  readonly importedAt: string;
  readonly durationSeconds: number;
}

interface RecentVideosStore {
  readonly files: readonly StoredRecentVideoFile[];
}

export class RecentFilesService {
  constructor(private readonly storePath: string) {}

  async list(): Promise<readonly StoredRecentVideoFile[]> {
    const store = await this.readStore();
    return store.files;
  }

  async add(record: StoredRecentVideoFile): Promise<void> {
    const store = await this.readStore();
    const withoutDuplicate = store.files.filter((file) => file.id !== record.id);
    const nextFiles = [record, ...withoutDuplicate].slice(0, MAX_RECENT_VIDEO_FILES);
    await this.writeStore({ files: nextFiles });
  }

  async findById(id: string): Promise<StoredRecentVideoFile | null> {
    const store = await this.readStore();
    return store.files.find((file) => file.id === id) ?? null;
  }

  private async readStore(): Promise<RecentVideosStore> {
    try {
      const raw = await readFile(this.storePath, 'utf8');
      const parsed = JSON.parse(raw) as RecentVideosStore;
      if (!Array.isArray(parsed.files)) {
        return { files: [] };
      }

      return parsed;
    } catch {
      return { files: [] };
    }
  }

  private async writeStore(store: RecentVideosStore): Promise<void> {
    await mkdir(dirname(this.storePath), { recursive: true });
    await writeFile(this.storePath, JSON.stringify(store, null, 2), 'utf8');
  }
}

export function getRecentFilesStorePath(userDataPath: string): string {
  return join(userDataPath, 'recent-videos.json');
}

export type { StoredRecentVideoFile };
