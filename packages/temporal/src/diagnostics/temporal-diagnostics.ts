import type { TemporalRepository } from '../repository/temporal-repository.js';

export interface TemporalWorkflowReport {
  readonly workflowId: string;
  readonly languages: readonly string[];
  readonly operations: {
    readonly total: number;
    readonly completed: number;
    readonly failed: number;
  };
}

export class TemporalDiagnostics {
  buildWorkflowReport(repository: TemporalRepository, workflowId: string): TemporalWorkflowReport {
    const operations = repository.listOperations(workflowId);
    const languages = [
      ...new Set(
        operations
          .filter((operation) => operation.status === 'completed')
          .map((operation) => operation.languageCode)
          .filter((languageCode): languageCode is string => languageCode !== null),
      ),
    ];

    return {
      workflowId,
      languages,
      operations: {
        total: operations.length,
        completed: operations.filter((operation) => operation.status === 'completed').length,
        failed: operations.filter((operation) => operation.status === 'failed').length,
      },
    };
  }
}
