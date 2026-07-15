import type { TranscriptionOperationRecord } from '../repository/localization-repository.js';
import type { LocalizationRepository } from '../repository/localization-repository.js';

export interface TranscriptionDiagnosticEntry {
  readonly timestamp: string;
  readonly level: 'info' | 'warn' | 'error';
  readonly message: string;
  readonly workflowId: string | null;
  readonly nodeId: string | null;
}

export class TranscriptionDiagnostics {
  private readonly entries: TranscriptionDiagnosticEntry[] = [];

  record(entry: Omit<TranscriptionDiagnosticEntry, 'timestamp'>): void {
    this.entries.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  getEntries(): readonly TranscriptionDiagnosticEntry[] {
    return this.entries;
  }

  summarizeOperations(operations: readonly TranscriptionOperationRecord[]): {
    readonly total: number;
    readonly completed: number;
    readonly failed: number;
    readonly running: number;
  } {
    return {
      total: operations.length,
      completed: operations.filter((operation) => operation.status === 'completed').length,
      failed: operations.filter((operation) => operation.status === 'failed').length,
      running: operations.filter((operation) => operation.status === 'running').length,
    };
  }

  buildWorkflowReport(
    repository: LocalizationRepository,
    workflowId: string,
  ): {
    readonly workflowId: string;
    readonly englishTranscriptFound: boolean;
    readonly operations: ReturnType<TranscriptionDiagnostics['summarizeOperations']>;
    readonly diagnostics: readonly TranscriptionDiagnosticEntry[];
  } {
    const englishTranscript = repository.getCanonicalTranscript(workflowId, 'en');

    return {
      workflowId,
      englishTranscriptFound: englishTranscript !== null,
      operations: this.summarizeOperations(repository.listOperations(workflowId)),
      diagnostics: this.getEntries().filter((entry) => entry.workflowId === workflowId),
    };
  }
}
