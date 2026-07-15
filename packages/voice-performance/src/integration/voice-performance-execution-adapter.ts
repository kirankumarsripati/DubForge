import {
  EXECUTION_ADAPTER_KINDS,
  type ExecutionAdapter,
  type ExecutionAdapterRequest,
  type ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import type { VoicePerformanceApplication } from '../application/voice-performance-application.js';

export class VoicePerformanceExecutionAdapter implements ExecutionAdapter {
  readonly kind = EXECUTION_ADAPTER_KINDS.VOICE_PERFORMANCE;

  constructor(private readonly application: VoicePerformanceApplication) {}

  canHandle(request: ExecutionAdapterRequest): boolean {
    return this.application.canHandle(request.nodeKind);
  }

  execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    return this.application.executeNode(request);
  }
}

export const VOICE_PERFORMANCE_NODE_KINDS: readonly NodeKind[] = [
  NODE_KINDS.SPEECH,
  NODE_KINDS.ALIGN,
];

export function isVoicePerformanceNodeKind(nodeKind: NodeKind): boolean {
  return VOICE_PERFORMANCE_NODE_KINDS.includes(nodeKind);
}
