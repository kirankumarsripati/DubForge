import { DELIVERY_OPERATION_STATUSES } from '../domain/constants.js';
import type { DeliveryRepository } from '../persistence/delivery-repository.js';

export interface DeliveryWorkflowReport {
  readonly workflowId: string;
  readonly deliverableCount: number;
  readonly operations: {
    readonly total: number;
    readonly completed: number;
    readonly failed: number;
  };
}

export class DeliveryDiagnostics {
  buildWorkflowReport(repository: DeliveryRepository, workflowId: string): DeliveryWorkflowReport {
    const operations = repository.listOperations(workflowId);
    const deliverables = repository.listDeliverables(workflowId);

    return {
      workflowId,
      deliverableCount: deliverables.length,
      operations: {
        total: operations.length,
        completed: operations.filter(
          (operation) => operation.status === DELIVERY_OPERATION_STATUSES.COMPLETED,
        ).length,
        failed: operations.filter(
          (operation) => operation.status === DELIVERY_OPERATION_STATUSES.FAILED,
        ).length,
      },
    };
  }
}
