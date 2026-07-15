import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CachedVideoRecord, VideoProbeResult } from '@dubforge/shared';
import { calculateThumbnailTimestampSeconds } from '@dubforge/shared';

const METADATA_FILE_NAME = 'metadata.json';
const THUMBNAIL_FILE_NAME = 'thumbnail.png';

export interface VideoCachePaths {
  readonly cacheRoot: string;
  readonly metadataPath: string;
  readonly thumbnailPath: string;
}

export class VideoCacheService {
  constructor(private readonly cacheRoot: string) {}

  getPaths(videoId: string): VideoCachePaths {
    const directory = join(this.cacheRoot, videoId);
    return {
      cacheRoot: this.cacheRoot,
      metadataPath: join(directory, METADATA_FILE_NAME),
      thumbnailPath: join(directory, THUMBNAIL_FILE_NAME),
    };
  }

  async computeVideoId(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (chunk) => {
        hash.update(chunk);
      });
      stream.on('error', (error: Error) => {
        reject(error);
      });
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
    });
  }

  async readCachedRecord(videoId: string): Promise<CachedVideoRecord | null> {
    const { metadataPath } = this.getPaths(videoId);

    try {
      const raw = await readFile(metadataPath, 'utf8');
      const parsed = JSON.parse(raw) as CachedVideoRecord;
      return parsed;
    } catch {
      return null;
    }
  }

  isCacheValid(
    record: CachedVideoRecord,
    fileSizeBytes: number,
    fileModifiedAtMs: number,
  ): boolean {
    return record.fileSizeBytes === fileSizeBytes && record.fileModifiedAtMs === fileModifiedAtMs;
  }

  async writeCachedRecord(record: CachedVideoRecord): Promise<void> {
    const { metadataPath } = this.getPaths(record.id);
    await mkdir(dirname(metadataPath), { recursive: true });
    await writeFile(metadataPath, JSON.stringify(record, null, 2), 'utf8');
  }

  async hasThumbnail(videoId: string): Promise<boolean> {
    const { thumbnailPath } = this.getPaths(videoId);
    try {
      await access(thumbnailPath);
      return true;
    } catch {
      return false;
    }
  }

  buildRecord(input: {
    readonly id: string;
    readonly filePath: string;
    readonly filename: string;
    readonly fileSizeBytes: number;
    readonly fileModifiedAtMs: number;
    readonly probe: VideoProbeResult;
  }): CachedVideoRecord {
    const { probe } = input;

    return {
      id: input.id,
      filePath: input.filePath,
      filename: input.filename,
      fileSizeBytes: input.fileSizeBytes,
      fileModifiedAtMs: input.fileModifiedAtMs,
      durationSeconds: Math.round(probe.durationSeconds),
      resolution: `${String(probe.videoStream.width)}×${String(probe.videoStream.height)}`,
      codec: probe.videoStream.codec,
      audioTracks: probe.audioTrackCount,
      frameRate: Number(probe.videoStream.frameRate.toFixed(2)),
      bitrateKbps: probe.bitrateKbps,
      thumbnailTimestampSeconds: calculateThumbnailTimestampSeconds(probe.durationSeconds),
      cachedAt: new Date().toISOString(),
    };
  }

  async getFileStats(filePath: string): Promise<{
    readonly fileSizeBytes: number;
    readonly fileModifiedAtMs: number;
  }> {
    const fileStats = await stat(filePath);
    return {
      fileSizeBytes: fileStats.size,
      fileModifiedAtMs: fileStats.mtimeMs,
    };
  }
}
