import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { rename, stat, unlink } from 'node:fs/promises';

import type { DownloadProviderRegistry } from './download-provider-registry.js';
import type { AssetDownloadManifest, DownloadSource } from './types.js';

const HASH_CHUNK_BYTES = 1024 * 1024;

export async function hashFileSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256');

  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath, { highWaterMark: HASH_CHUNK_BYTES });
    stream.on('data', (chunk: Buffer) => {
      hash.update(chunk);
    });
    stream.on('error', reject);
    stream.on('end', () => {
      resolve();
    });
  });

  return hash.digest('hex');
}

export async function verifyDownloadedFile(
  filePath: string,
  expectedChecksum: string | null,
): Promise<string> {
  const actualChecksum = await hashFileSha256(filePath);

  if (expectedChecksum !== null && actualChecksum !== expectedChecksum) {
    throw new Error('Checksum mismatch after download');
  }

  return actualChecksum;
}

export async function atomicRenameVerifiedFile(
  tempPath: string,
  finalPath: string,
  expectedChecksum: string | null,
): Promise<{ readonly checksum: string; readonly sizeBytes: number }> {
  const checksum = await verifyDownloadedFile(tempPath, expectedChecksum);
  const fileStats = await stat(tempPath);

  await rename(tempPath, finalPath);

  return {
    checksum,
    sizeBytes: fileStats.size,
  };
}

export async function resolveResumeOffset(tempPath: string): Promise<number> {
  const fileStats = await stat(tempPath).catch(() => null);
  return fileStats?.size ?? 0;
}

export async function downloadFromManifestSources(input: {
  readonly manifest: AssetDownloadManifest;
  readonly registry: DownloadProviderRegistry;
  readonly tempPath: string;
  readonly assetId: string;
  readonly version: string;
  readonly signal: AbortSignal;
  readonly onProgress: (bytesDownloaded: number, totalBytes: number | null) => void;
}): Promise<void> {
  if (input.manifest.sources.length === 0) {
    throw new Error(`Asset ${input.assetId} does not declare any download sources`);
  }

  const resumeFromByte = await resolveResumeOffset(input.tempPath);
  const errors: string[] = [];

  for (const source of input.manifest.sources) {
    const provider = input.registry.resolve(source);
    if (provider === null) {
      errors.push(`No provider registered for source type: ${source.type}`);
      continue;
    }

    try {
      await provider.download(source, {
        assetId: input.assetId,
        version: input.version,
        tempPath: input.tempPath,
        resumeFromByte,
        signal: input.signal,
        onProgress: (update) => {
          input.onProgress(update.bytesDownloaded, update.totalBytes);
        },
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      errors.push(`${source.type} (${source.url}): ${message}`);
      await unlink(input.tempPath).catch(() => undefined);
    }
  }

  throw new Error(errors.join('; '));
}

export async function probeManifestTotalBytes(
  sources: readonly DownloadSource[],
  registry: DownloadProviderRegistry,
): Promise<number | null> {
  for (const source of sources) {
    const provider = registry.resolve(source);
    if (provider?.probeTotalBytes === undefined) {
      continue;
    }

    const totalBytes = await provider.probeTotalBytes(source);
    if (totalBytes !== null) {
      return totalBytes;
    }
  }

  return null;
}
