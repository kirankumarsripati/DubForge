import { execFile } from 'node:child_process';

import { ffprobeOutputSchema } from './ffprobe-schema.js';
import { parseFfprobeOutput } from './ffprobe-parser.js';
import type { VideoProbeResult } from './types.js';
import {
  buildFfprobeArgs,
  FfprobeExecutionError,
  FfprobeParseError,
  formatCommand,
  type FfprobeDiagnostics,
} from './ffprobe-diagnostics.js';

export {
  buildFfprobeArgs,
  FfprobeExecutionError,
  FfprobeParseError,
  formatFfprobeDiagnostics,
  type FfprobeDiagnostics,
} from './ffprobe-diagnostics.js';

function execFileAsync(
  executablePath: string,
  args: readonly string[],
  options: { readonly maxBuffer: number },
): Promise<{ readonly stdout: string }> {
  return new Promise((resolve, reject) => {
    execFile(executablePath, [...args], options, (error, stdout, stderr) => {
      if (error) {
        const execError = error as NodeJS.ErrnoException & {
          readonly code?: number | string;
          readonly stderr?: string | Buffer;
          readonly cmd?: string;
        };
        Object.assign(execError, { stderr });
        reject(execError);
        return;
      }

      resolve({ stdout: stdout.toString() });
    });
  });
}

function extractExecFailure(
  executablePath: string,
  args: readonly string[],
  error: unknown,
): FfprobeExecutionError {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const execError = error as NodeJS.ErrnoException & {
      readonly code?: number | string;
      readonly stderr?: string | Buffer;
      readonly cmd?: string;
    };

    const exitCode = typeof execError.code === 'number' ? execError.code : null;
    const stderr =
      typeof execError.stderr === 'string'
        ? execError.stderr
        : execError.stderr instanceof Buffer
          ? execError.stderr.toString('utf8')
          : execError.message;

    const diagnostics: FfprobeDiagnostics = {
      executablePath,
      args,
      command: execError.cmd ?? formatCommand(executablePath, args),
      exitCode,
      stderr: stderr.trim(),
    };

    if (execError.code === 'ENOENT') {
      return new FfprobeExecutionError(
        `ffprobe executable was not found at "${executablePath}".`,
        diagnostics,
      );
    }

    return new FfprobeExecutionError(
      diagnostics.stderr.length > 0
        ? diagnostics.stderr
        : 'ffprobe failed to inspect the media file.',
      diagnostics,
    );
  }

  const diagnostics: FfprobeDiagnostics = {
    executablePath,
    args,
    command: formatCommand(executablePath, args),
    exitCode: null,
    stderr: error instanceof Error ? error.message : 'Unknown ffprobe failure.',
  };

  return new FfprobeExecutionError(diagnostics.stderr, diagnostics);
}

export async function runFfprobe(
  executablePath: string,
  filePath: string,
): Promise<{ readonly stdout: string; readonly diagnostics: FfprobeDiagnostics }> {
  const args = buildFfprobeArgs(filePath);
  const command = formatCommand(executablePath, args);

  try {
    const { stdout } = await execFileAsync(executablePath, args, {
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      stdout,
      diagnostics: {
        executablePath,
        args,
        command,
        exitCode: 0,
        stderr: '',
      },
    };
  } catch (error) {
    throw extractExecFailure(executablePath, args, error);
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
