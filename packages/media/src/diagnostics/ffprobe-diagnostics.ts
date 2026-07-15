import type { FfprobeDiagnostics } from '@dubforge/shared';

export interface FfprobeDiagnosticRecord {
  readonly timestamp: string;
  readonly success: boolean;
  readonly filePath: string;
  readonly diagnostics: FfprobeDiagnostics;
  readonly message: string | null;
}

export class FfprobeDiagnosticsCollector {
  private readonly records: FfprobeDiagnosticRecord[] = [];

  recordSuccess(input: {
    readonly filePath: string;
    readonly diagnostics: FfprobeDiagnostics;
  }): void {
    this.records.push({
      timestamp: new Date().toISOString(),
      success: true,
      filePath: input.filePath,
      diagnostics: input.diagnostics,
      message: null,
    });
  }

  recordFailure(input: {
    readonly filePath: string;
    readonly diagnostics: FfprobeDiagnostics;
    readonly message: string;
  }): void {
    this.records.push({
      timestamp: new Date().toISOString(),
      success: false,
      filePath: input.filePath,
      diagnostics: input.diagnostics,
      message: input.message,
    });
  }

  getRecords(): readonly FfprobeDiagnosticRecord[] {
    return this.records;
  }

  getLatest(): FfprobeDiagnosticRecord | null {
    return this.records.at(-1) ?? null;
  }

  clear(): void {
    this.records.length = 0;
  }
}
