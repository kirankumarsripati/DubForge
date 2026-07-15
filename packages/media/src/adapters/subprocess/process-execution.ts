import { execFile } from 'node:child_process';

export interface ProcessExecutionDiagnostics {
  readonly executablePath: string;
  readonly args: readonly string[];
  readonly command: string;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly workingDirectory: string;
  readonly durationMs: number;
}

export class ProcessExecutionError extends Error {
  readonly diagnostics: ProcessExecutionDiagnostics;

  constructor(message: string, diagnostics: ProcessExecutionDiagnostics) {
    super(message);
    this.name = 'ProcessExecutionError';
    this.diagnostics = diagnostics;
  }
}

export function formatProcessCommand(executablePath: string, args: readonly string[]): string {
  return [executablePath, ...args]
    .map((segment) => (/\s/u.test(segment) ? `"${segment}"` : segment))
    .join(' ');
}

export function formatProcessDiagnostics(diagnostics: ProcessExecutionDiagnostics): string {
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

export interface RunProcessOptions {
  readonly executablePath: string;
  readonly args: readonly string[];
  readonly workingDirectory?: string;
  readonly maxBuffer?: number;
}

export interface RunProcessResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly diagnostics: ProcessExecutionDiagnostics;
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
): ProcessExecutionDiagnostics {
  return {
    executablePath,
    args,
    command: formatProcessCommand(executablePath, args),
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    workingDirectory,
    durationMs,
  };
}

export async function runProcess(options: RunProcessOptions): Promise<RunProcessResult> {
  const startedAt = Date.now();
  const workingDirectory = options.workingDirectory ?? process.cwd();
  const args = [...options.args];
  const command = formatProcessCommand(options.executablePath, args);

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
            readonly cmd?: string;
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
              new ProcessExecutionError(
                `${options.executablePath} executable was not found.`,
                diagnostics,
              ),
            );
            return;
          }

          reject(
            new ProcessExecutionError(
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
