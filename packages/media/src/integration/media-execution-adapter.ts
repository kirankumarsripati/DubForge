import { MEDIA_EVENTS, type DomainEventBus } from '@dubforge/platform-events';
import {
  EXECUTION_ADAPTER_KINDS,
  type ExecutionAdapter,
  type ExecutionAdapterRequest,
  type ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import type { MediaApplication } from '../application/media-application.js';

export class MediaExecutionAdapter implements ExecutionAdapter {
  readonly kind = EXECUTION_ADAPTER_KINDS.MEDIA;

  constructor(private readonly application: MediaApplication) {}

  canHandle(request: ExecutionAdapterRequest): boolean {
    return this.application.canHandle(request.nodeKind);
  }

  execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    return this.application.executeNode(request);
  }
}

export const MEDIA_NODE_KINDS: readonly NodeKind[] = [
  NODE_KINDS.METADATA,
  NODE_KINDS.EXTRACT_AUDIO,
  NODE_KINDS.MUX,
];

export function isMediaNodeKind(nodeKind: NodeKind): boolean {
  return MEDIA_NODE_KINDS.includes(nodeKind);
}

export function subscribeToMediaDiagnostics(
  eventBus: DomainEventBus,
  collector: { record(entry: { readonly level: string; readonly message: string }): void },
): () => void {
  return eventBus.subscribeToType(MEDIA_EVENTS.DIAGNOSTIC_RECORDED, (event) => {
    if ('level' in event && 'message' in event) {
      collector.record({
        level: event.level,
        message: event.message,
      });
    }
  });
}
