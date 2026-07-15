import {
  EXECUTION_ADAPTER_KINDS,
  type ExecutionAdapter,
  type ExecutionAdapterRequest,
  type ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import type { TranscriptionApplication } from '../application/transcription-application.js';

export class TranscriptionExecutionAdapter implements ExecutionAdapter {
  readonly kind = EXECUTION_ADAPTER_KINDS.TRANSCRIPTION;

  constructor(private readonly application: TranscriptionApplication) {}

  canHandle(request: ExecutionAdapterRequest): boolean {
    return this.application.canHandle(request.nodeKind);
  }

  execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    return this.application.executeNode(request);
  }
}

export const TRANSCRIPTION_NODE_KINDS: readonly NodeKind[] = [
  NODE_KINDS.SPEECH_RECOGNITION,
  NODE_KINDS.ENGLISH_TRANSCRIPT,
];

export function isTranscriptionNodeKind(nodeKind: NodeKind): boolean {
  return TRANSCRIPTION_NODE_KINDS.includes(nodeKind);
}
