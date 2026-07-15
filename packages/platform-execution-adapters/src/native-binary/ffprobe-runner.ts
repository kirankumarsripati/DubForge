import { ffprobeOutputSchema } from '@dubforge/shared';
import { parseFfprobeOutput } from '@dubforge/shared';
import {
  buildFfprobeArgs,
  FfprobeExecutionError,
  FfprobeParseError,
  type FfprobeDiagnostics,
} from '@dubforge/shared';
import type { VideoProbeResult } from '@dubforge/shared';

import { BinaryProcessError, runBinaryProcess } from './binary-process-runner.js';

function toFfprobeDiagnostics(diagnostics: {
  readonly executablePath: string;
  readonly args: readonly string[];
  readonly command: string;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly workingDirectory: string;
  readonly durationMs: number;
}): FfprobeDiagnostics {
  return diagnostics;
}

export async function runFfprobe(
  executablePath: string,
  filePath: string,
): Promise<{ readonly stdout: string; readonly diagnostics: FfprobeDiagnostics }> {
  const args = buildFfprobeArgs(filePath);

  try {
    const result = await runBinaryProcess({
      executablePath,
      args,
    });

    return {
      stdout: result.stdout,
      diagnostics: toFfprobeDiagnostics(result.diagnostics),
    };
  } catch (error) {
    if (error instanceof BinaryProcessError) {
      throw new FfprobeExecutionError(error.message, toFfprobeDiagnostics(error.diagnostics));
    }

    throw error;
  }
}

export async function probeVideoFile(
  executablePath: string,
  filePath: string,
): Promise<{ readonly probe: VideoProbeResult; readonly diagnostics: FfprobeDiagnostics }> {
  const { stdout, diagnostics } = await runFfprobe(executablePath, filePath);

  try {
    const parsed = ffprobeOutputSchema.parse(JSON.parse(stdout));
    return {
      probe: parseFfprobeOutput(parsed),
      diagnostics,
    };
  } catch (error) {
    if (error instanceof FfprobeExecutionError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Failed to parse ffprobe output.';
    throw new FfprobeParseError(message);
  }
}
