import {
  EXECUTION_ADAPTER_KINDS,
  type ExecutionAdapter,
  type ExecutionAdapterRequest,
  type ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import type { TemporalSynchronizationApplication } from '../application/temporal-synchronization-application.js';

export class TemporalExecutionAdapter implements ExecutionAdapter {
  readonly kind = EXECUTION_ADAPTER_KINDS.TEMPORAL;

  constructor(private readonly application: TemporalSynchronizationApplication) {}

  canHandle(request: ExecutionAdapterRequest): boolean {
    return this.application.canHandle(request.nodeKind);
  }

  execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    return this.application.executeNode(request);
  }
}

export const TEMPORAL_NODE_KINDS: readonly NodeKind[] = [NODE_KINDS.ALIGN];

export function isTemporalNodeKind(nodeKind: NodeKind): boolean {
  return TEMPORAL_NODE_KINDS.includes(nodeKind);
}
