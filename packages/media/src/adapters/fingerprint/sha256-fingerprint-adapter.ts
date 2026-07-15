import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

import { MEDIA_ARTIFACT_FILENAMES } from '../../domain/artifact-names.js';
import type {
  FingerprintMediaInput,
  FingerprintMediaPort,
  FingerprintMediaResult,
} from '../../ports/media-ports.js';

export class Sha256FingerprintAdapter implements FingerprintMediaPort {
  async fingerprint(input: FingerprintMediaInput): Promise<FingerprintMediaResult> {
    const startedAt = Date.now();
    const contentHash = await this.computeSha256(input.filePath);
    const durationMs = Date.now() - startedAt;
    const artifactPath = `${input.artifactRoot}/${MEDIA_ARTIFACT_FILENAMES.FINGERPRINT}`;
    const fingerprintJson = JSON.stringify(
      {
        adapter: 'sha256-fingerprint',
        filePath: input.filePath,
        algorithm: 'sha256',
        contentHash,
        fileSizeBytes: input.fileSizeBytes,
        fileModifiedAtMs: input.fileModifiedAtMs,
        fingerprintedAt: new Date().toISOString(),
      },
      null,
      2,
    );

    return {
      contentHash,
      artifactPath,
      fingerprintJson,
      durationMs,
    };
  }

  private computeSha256(filePath: string): Promise<string> {
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
}
