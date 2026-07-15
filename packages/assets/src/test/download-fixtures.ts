import { createHash, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { DOWNLOAD_SOURCE_TYPES } from '../download/source-types.js';
import type { AssetDownloadManifest } from '../download/types.js';

export async function createLocalFileManifest(
  content: string,
  directory: string,
): Promise<{ readonly manifest: AssetDownloadManifest; readonly checksum: string }> {
  const checksum = createHash('sha256').update(content).digest('hex');
  const filePath = join(directory, `${randomUUID()}.bin`);
  await writeFile(filePath, content);

  return {
    checksum,
    manifest: {
      sources: [{ type: DOWNLOAD_SOURCE_TYPES.LOCAL_FILE, url: filePath }],
      checksum,
      filename: 'asset.bin',
    },
  };
}
