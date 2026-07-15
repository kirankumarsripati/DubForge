import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

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
