import {
  EXECUTION_ADAPTER_KINDS,
  type ExecutionAdapter,
  type ExecutionAdapterRequest,
  type ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import type { LocalizationApplication } from '../application/localization-application.js';

export class LocalizationExecutionAdapter implements ExecutionAdapter {
  readonly kind = EXECUTION_ADAPTER_KINDS.LOCALIZATION;

  constructor(private readonly application: LocalizationApplication) {}

  canHandle(request: ExecutionAdapterRequest): boolean {
    return this.application.canHandle(request.nodeKind);
  }

  execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    return this.application.executeNode(request);
  }
}

export const LOCALIZATION_NODE_KINDS: readonly NodeKind[] = [
  NODE_KINDS.TRANSLATE,
  NODE_KINDS.SUBTITLE,
  NODE_KINDS.ENGLISH_SUBTITLE,
];

export function isLocalizationNodeKind(nodeKind: NodeKind): boolean {
  return LOCALIZATION_NODE_KINDS.includes(nodeKind);
}
