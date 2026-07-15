import type { MediaOperation } from '../domain/entities/media-entities.js';
import type { MediaRepository } from '../repository/media-repository.js';

export interface MediaDiagnosticEntry {
  readonly timestamp: string;
  readonly level: 'info' | 'warn' | 'error';
  readonly message: string;
  readonly workflowId: string | null;
  readonly nodeId: string | null;
}

export class MediaDiagnostics {
  private readonly entries: MediaDiagnosticEntry[] = [];

  record(entry: Omit<MediaDiagnosticEntry, 'timestamp'>): void {
    this.entries.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  getEntries(): readonly MediaDiagnosticEntry[] {
    return this.entries;
  }

  summarizeOperations(operations: readonly MediaOperation[]): {
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
    repository: MediaRepository,
    workflowId: string,
  ): {
    readonly workflowId: string;
    readonly mediaFileFound: boolean;
    readonly operations: ReturnType<MediaDiagnostics['summarizeOperations']>;
    readonly diagnostics: readonly MediaDiagnosticEntry[];
  } {
    const mediaFile = repository.findMediaFileByWorkflow(workflowId);
    const operations = repository.listOperationsByWorkflow(workflowId);

    return {
      workflowId,
      mediaFileFound: mediaFile !== null,
      operations: this.summarizeOperations(operations),
      diagnostics: this.getEntries().filter((entry) => entry.workflowId === workflowId),
    };
  }
}
