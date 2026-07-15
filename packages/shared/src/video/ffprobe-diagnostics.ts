export interface FfprobeDiagnostics {
  readonly executablePath: string;
  readonly args: readonly string[];
  readonly command: string;
  readonly exitCode: number | null;
  readonly stderr: string;
}

export class FfprobeExecutionError extends Error {
  readonly diagnostics: FfprobeDiagnostics;

  constructor(message: string, diagnostics: FfprobeDiagnostics) {
    super(message);
    this.name = 'FfprobeExecutionError';
    this.diagnostics = diagnostics;
  }
}

export class FfprobeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FfprobeParseError';
  }
}

export function formatCommand(executablePath: string, args: readonly string[]): string {
  return [executablePath, ...args]
    .map((segment) => (/\s/u.test(segment) ? `"${segment}"` : segment))
    .join(' ');
}

export function buildFfprobeArgs(filePath: string): readonly string[] {
  return ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath];
}

export function formatFfprobeDiagnostics(diagnostics: FfprobeDiagnostics): string {
  const exitCode = diagnostics.exitCode === null ? 'unknown' : String(diagnostics.exitCode);
  return [
    `Executable: ${diagnostics.executablePath}`,
    `Command: ${diagnostics.command}`,
    `Exit code: ${exitCode}`,
    `stderr: ${diagnostics.stderr.length > 0 ? diagnostics.stderr : '(empty)'}`,
  ].join('\n');
}
