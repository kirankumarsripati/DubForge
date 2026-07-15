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

function readStreamOutput(value: string | Buffer | undefined): string {
  if (value === undefined) {
    return '';
  }

  return typeof value === 'string' ? value : value.toString('utf8');
}

function buildDiagnostics(
  executablePath: string,
  args: readonly string[],
  workingDirectory: string,
  durationMs: number,
  exitCode: number | null,
  stdout: string,
  stderr: string,
): FfprobeDiagnostics {
  return {
    executablePath,
    args,
    command: formatCommand(executablePath, args),
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    workingDirectory,
    durationMs,
  };
}

function extractExecFailure(
  executablePath: string,
  args: readonly string[],
  workingDirectory: string,
  durationMs: number,
  error: unknown,
): FfprobeExecutionError {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const execError = error as NodeJS.ErrnoException & {
      readonly code?: number | string;
      readonly stderr?: string | Buffer;
      readonly stdout?: string | Buffer;
      readonly cmd?: string;
    };

    const exitCode = typeof execError.code === 'number' ? execError.code : null;
    const stderr =
      typeof execError.stderr === 'string'
        ? execError.stderr
        : execError.stderr instanceof Buffer
          ? execError.stderr.toString('utf8')
          : execError.message;
    const stdout =
      typeof execError.stdout === 'string'
        ? execError.stdout
        : execError.stdout instanceof Buffer
          ? execError.stdout.toString('utf8')
          : '';

    const diagnostics = buildDiagnostics(
      executablePath,
      args,
      workingDirectory,
      durationMs,
      exitCode,
      stdout,
      stderr,
    );

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

  const diagnostics = buildDiagnostics(
    executablePath,
    args,
    workingDirectory,
    durationMs,
    null,
    '',
    error instanceof Error ? error.message : 'Unknown ffprobe failure.',
  );

  return new FfprobeExecutionError(diagnostics.stderr, diagnostics);
}

export async function runFfprobe(
  executablePath: string,
  filePath: string,
): Promise<{ readonly stdout: string; readonly diagnostics: FfprobeDiagnostics }> {
  const startedAt = Date.now();
  const workingDirectory = process.cwd();
  const args = buildFfprobeArgs(filePath);

  const { execFile } = await import('node:child_process');

  return new Promise((resolve, reject) => {
    execFile(
      executablePath,
      [...args],
      {
        cwd: workingDirectory,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startedAt;
        const stdoutText = readStreamOutput(stdout);
        const stderrText = readStreamOutput(stderr);

        if (error) {
          reject(extractExecFailure(executablePath, args, workingDirectory, durationMs, error));
          return;
        }

        resolve({
          stdout: stdoutText,
          diagnostics: buildDiagnostics(
            executablePath,
            args,
            workingDirectory,
            durationMs,
            0,
            stdoutText,
            stderrText,
          ),
        });
      },
    );
  });
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
