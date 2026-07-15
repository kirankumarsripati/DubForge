import { randomUUID } from 'node:crypto';

import { EXECUTION_STATUSES } from './types.js';
import type { ActiveExecution, CancellationSignal, ExecutionStatus } from './types.js';

export class ProcessManager {
  private readonly executions = new Map<string, ActiveExecution>();
  private readonly abortControllers = new Map<string, AbortController>();

  register(
    executionId: string,
    workflowId: string,
    jobId: string,
    nodeId: string,
    adapterKind: string,
    timeoutMs: number,
    parentSignal?: CancellationSignal,
  ): CancellationSignal {
    const controller = new AbortController();
    const startedAt = new Date().toISOString();

    this.executions.set(executionId, {
      executionId,
      workflowId,
      jobId,
      nodeId,
      status: EXECUTION_STATUSES.RUNNING,
      adapterKind,
      startedAt,
      timeoutMs,
    });
    this.abortControllers.set(executionId, controller);

    if (parentSignal !== undefined) {
      if (parentSignal.aborted) {
        controller.abort();
      } else {
        parentSignal.addEventListener(
          'abort',
          () => {
            controller.abort();
          },
          { once: true },
        );
      }
    }

    return controller.signal;
  }

  complete(executionId: string, status: ExecutionStatus): void {
    const current = this.executions.get(executionId);
    if (current === undefined) {
      return;
    }

    this.executions.set(executionId, { ...current, status });
    this.abortControllers.delete(executionId);
  }

  cancel(executionId: string): void {
    this.abortControllers.get(executionId)?.abort();
    this.complete(executionId, EXECUTION_STATUSES.CANCELLED);
  }

  cancelAll(): void {
    for (const executionId of this.abortControllers.keys()) {
      this.cancel(executionId);
    }
  }

  getActiveExecutions(): readonly ActiveExecution[] {
    return [...this.executions.values()].filter(
      (execution) => execution.status === EXECUTION_STATUSES.RUNNING,
    );
  }

  createExecutionId(): string {
    return randomUUID();
  }
}

export interface TimeoutController {
  readonly signal: CancellationSignal;
  clear(): void;
}

export function createTimeoutSignal(
  timeoutMs: number,
  parentSignal?: CancellationSignal,
): TimeoutController {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  if (parentSignal !== undefined) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener(
        'abort',
        () => {
          controller.abort();
        },
        { once: true },
      );
    }
  }

  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
    },
  };
}
