import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type {
  ExtractAudioInput,
  ExtractAudioPort,
  ExtractAudioResult,
} from '../../ports/media-ports.js';

export class FixtureExtractAudioAdapter implements ExtractAudioPort {
  async extract(input: ExtractAudioInput): Promise<ExtractAudioResult> {
    const audioPath = input.outputPath;
    await mkdir(dirname(audioPath), { recursive: true });
    await writeFile(audioPath, 'FIXTURE_AUDIO_PCM');

    const artifactPath = `${input.artifactRoot}/${input.nodeId}-extract-audio.json`;
    input.onProgress(100);

    return {
      audioPath,
      artifactPath,
      durationMs: 1,
    };
  }

  buildArtifactContent(input: ExtractAudioInput, audioPath: string): string {
    return JSON.stringify(
      {
        adapter: 'fixture-extract-audio',
        sourcePath: input.filePath,
        audioPath,
        sampleRate: 16000,
        channels: 1,
        codec: 'pcm_s16le',
      },
      null,
      2,
    );
  }
}
