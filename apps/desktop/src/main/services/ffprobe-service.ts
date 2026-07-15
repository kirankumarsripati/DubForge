import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ffprobeOutputSchema, parseFfprobeOutput, type VideoProbeResult } from '@dubforge/shared';

const execFileAsync = promisify(execFile);

export class FfprobeService {
  constructor(private readonly ffprobePath: string) {}

  async probe(filePath: string): Promise<VideoProbeResult> {
    const output = await this.runProbe(filePath);
    const parsed = ffprobeOutputSchema.parse(JSON.parse(output));
    return parseFfprobeOutput(parsed);
  }

  private async runProbe(filePath: string): Promise<string> {
    const args = [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    try {
      const { stdout } = await execFileAsync(this.ffprobePath, args, {
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message || 'ffprobe failed to inspect the video file.');
      }

      throw new Error('ffprobe failed to inspect the video file.');
    }
  }
}
