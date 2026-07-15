import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export class BackgroundSeparator {
  async separate(input: {
    readonly sourceAudioPath: string;
    readonly outputPath: string;
  }): Promise<string | null> {
    await mkdir(dirname(input.outputPath), { recursive: true });
    await writeFile(input.outputPath, `BACKGROUND_LAYER:${input.sourceAudioPath}`, 'utf8');
    return input.outputPath;
  }
}

export function createBackgroundSeparator(): BackgroundSeparator {
  return new BackgroundSeparator();
}
