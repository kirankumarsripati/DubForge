import type { LocalizationRepository } from '../repository/localization-repository.js';

export interface LocalizationWorkflowReport {
  readonly workflowId: string;
  readonly localizedLanguages: readonly string[];
  readonly operations: {
    readonly total: number;
    readonly completed: number;
    readonly failed: number;
  };
}

export class LocalizationDiagnostics {
  buildWorkflowReport(
    repository: LocalizationRepository,
    workflowId: string,
  ): LocalizationWorkflowReport {
    const operations = repository.listOperations(workflowId);
    const localizedLanguages = [
      ...new Set(
        operations
          .filter((operation) => operation.kind === 'translate' && operation.status === 'completed')
          .map((operation) => operation.languageCode)
          .filter((languageCode): languageCode is string => languageCode !== null),
      ),
    ];

    return {
      workflowId,
      localizedLanguages,
      operations: {
        total: operations.length,
        completed: operations.filter((operation) => operation.status === 'completed').length,
        failed: operations.filter((operation) => operation.status === 'failed').length,
      },
    };
  }
}
