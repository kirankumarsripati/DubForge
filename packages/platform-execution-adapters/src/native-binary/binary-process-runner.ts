import { execFile } from 'node:child_process';

export interface BinaryProcessDiagnostics {
  readonly executablePath: string;
  readonly args: readonly string[];
  readonly command: string;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly workingDirectory: string;
  readonly durationMs: number;
}

export class BinaryProcessError extends Error {
  readonly diagnostics: BinaryProcessDiagnostics;

  constructor(message: string, diagnostics: BinaryProcessDiagnostics) {
    super(message);
    this.name = 'BinaryProcessError';
    this.diagnostics = diagnostics;
  }
}

export function formatBinaryCommand(executablePath: string, args: readonly string[]): string {
  return [executablePath, ...args]
    .map((segment) => (/\s/u.test(segment) ? `"${segment}"` : segment))
    .join(' ');
}

export function formatBinaryDiagnostics(diagnostics: BinaryProcessDiagnostics): string {
  const exitCode = diagnostics.exitCode === null ? 'unknown' : String(diagnostics.exitCode);
  return [
    `Executable: ${diagnostics.executablePath}`,
    `Command: ${diagnostics.command}`,
    `Working directory: ${diagnostics.workingDirectory}`,
    `Exit code: ${exitCode}`,
    `Duration: ${String(diagnostics.durationMs)}ms`,
    `stdout: ${diagnostics.stdout.length > 0 ? diagnostics.stdout : '(empty)'}`,
    `stderr: ${diagnostics.stderr.length > 0 ? diagnostics.stderr : '(empty)'}`,
  ].join('\n');
}

export interface RunBinaryProcessOptions {
  readonly executablePath: string;
  readonly args: readonly string[];
  readonly workingDirectory?: string;
  readonly maxBuffer?: number;
}

export interface RunBinaryProcessResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly diagnostics: BinaryProcessDiagnostics;
}

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
): BinaryProcessDiagnostics {
  return {
    executablePath,
    args,
    command: formatBinaryCommand(executablePath, args),
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    workingDirectory,
    durationMs,
  };
}

export async function runBinaryProcess(
  options: RunBinaryProcessOptions,
): Promise<RunBinaryProcessResult> {
  const startedAt = Date.now();
  const workingDirectory = options.workingDirectory ?? process.cwd();
  const args = [...options.args];
  const command = formatBinaryCommand(options.executablePath, args);

  return new Promise((resolve, reject) => {
    execFile(
      options.executablePath,
      args,
      {
        cwd: workingDirectory,
        maxBuffer: options.maxBuffer ?? 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startedAt;
        const stdoutText = readStreamOutput(stdout);
        const stderrText = readStreamOutput(stderr);

        if (error) {
          const execError = error as NodeJS.ErrnoException & {
            readonly code?: number | string;
          };
          const exitCode = typeof execError.code === 'number' ? execError.code : null;
          const diagnostics = buildDiagnostics(
            options.executablePath,
            args,
            workingDirectory,
            durationMs,
            exitCode,
            stdoutText,
            stderrText.length > 0 ? stderrText : execError.message,
          );

          if (execError.code === 'ENOENT') {
            reject(
              new BinaryProcessError(
                `${options.executablePath} executable was not found.`,
                diagnostics,
              ),
            );
            return;
          }

          reject(
            new BinaryProcessError(
              diagnostics.stderr.length > 0 ? diagnostics.stderr : `${command} failed.`,
              diagnostics,
            ),
          );
          return;
        }

        const diagnostics = buildDiagnostics(
          options.executablePath,
          args,
          workingDirectory,
          durationMs,
          0,
          stdoutText,
          stderrText,
        );

        resolve({
          stdout: stdoutText,
          stderr: stderrText,
          diagnostics,
        });
      },
    );
  });
}
