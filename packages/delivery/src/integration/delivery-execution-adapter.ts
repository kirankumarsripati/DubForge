import {
  EXECUTION_ADAPTER_KINDS,
  type ExecutionAdapter,
  type ExecutionAdapterRequest,
  type ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import type { DeliveryApplication } from '../application/delivery-application.js';

export class DeliveryExecutionAdapter implements ExecutionAdapter {
  readonly kind = EXECUTION_ADAPTER_KINDS.DELIVERY;

  constructor(private readonly application: DeliveryApplication) {}

  canHandle(request: ExecutionAdapterRequest): boolean {
    return this.application.canHandle(request.nodeKind);
  }

  execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    return this.application.executeNode(request);
  }
}

export const DELIVERY_NODE_KINDS: readonly NodeKind[] = [NODE_KINDS.VERIFY, NODE_KINDS.MANIFEST];

export function isDeliveryNodeKind(nodeKind: NodeKind): boolean {
  return DELIVERY_NODE_KINDS.includes(nodeKind);
}
