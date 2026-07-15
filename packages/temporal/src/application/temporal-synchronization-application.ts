import type {
  ExecutionAdapterRequest,
  ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import { AlignAndComposeService } from './temporal-services.js';

const TEMPORAL_NODE_KINDS = new Set<NodeKind>([NODE_KINDS.ALIGN]);

export class TemporalSynchronizationApplication {
  constructor(private readonly alignAndComposeService: AlignAndComposeService) {}

  canHandle(nodeKind: NodeKind): boolean {
    return TEMPORAL_NODE_KINDS.has(nodeKind);
  }

  async executeNode(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    switch (request.nodeKind) {
      case NODE_KINDS.ALIGN:
        return this.alignAndComposeService.alignAndComposeForWorkflow({
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          languageCode: request.languageCode,
          artifactRoot: request.artifactRoot,
          artifactSink: request.artifactSink,
          onProgress: request.onProgress,
        });
      default:
        throw new Error(
          `Temporal synchronization application cannot handle node kind "${request.nodeKind}".`,
        );
    }
  }
}
