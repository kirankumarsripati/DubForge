import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { MuxMediaInput, MuxMediaPort, MuxMediaResult } from '../../ports/media-ports.js';

export class FixtureMuxAdapter implements MuxMediaPort {
  async mux(input: MuxMediaInput): Promise<MuxMediaResult> {
    await mkdir(dirname(input.outputPath), { recursive: true });
    await writeFile(input.outputPath, 'FIXTURE_MUXED_OUTPUT');

    const artifactPath = `${input.artifactRoot}/${input.nodeId}-mux.json`;
    input.onProgress(100);

    return {
      outputPath: input.outputPath,
      artifactPath,
      durationMs: 1,
    };
  }

  buildArtifactContent(input: MuxMediaInput, outputPath: string): string {
    return JSON.stringify(
      {
        adapter: 'fixture-mux',
        videoPath: input.videoPath,
        audioPath: input.audioPath,
        outputPath,
        videoCodec: 'copy',
        audioCodec: 'aac',
      },
      null,
      2,
    );
  }
}
