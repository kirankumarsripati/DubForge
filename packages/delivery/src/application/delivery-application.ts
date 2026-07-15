import type {
  ExecutionAdapterRequest,
  ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import { PackageAndDeliverService, VerifyDeliverablesService } from './delivery-services.js';

const DELIVERY_NODE_KINDS = new Set<NodeKind>([NODE_KINDS.VERIFY, NODE_KINDS.MANIFEST]);

export class DeliveryApplication {
  constructor(
    private readonly verifyService: VerifyDeliverablesService,
    private readonly packageService: PackageAndDeliverService,
  ) {}

  canHandle(nodeKind: NodeKind): boolean {
    return DELIVERY_NODE_KINDS.has(nodeKind);
  }

  async executeNode(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    switch (request.nodeKind) {
      case NODE_KINDS.VERIFY:
        return this.verifyService.verifyForWorkflow({
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          artifactRoot: request.artifactRoot,
          artifacts: request.artifacts,
          artifactSink: request.artifactSink,
          onProgress: request.onProgress,
        });
      case NODE_KINDS.MANIFEST:
        return this.packageService.packageForWorkflow({
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          artifactRoot: request.artifactRoot,
          artifacts: request.artifacts,
          output: request.output,
          outputDirectory: request.outputDirectory,
          artifactSink: request.artifactSink,
          onProgress: request.onProgress,
        });
      default:
        throw new Error(`Delivery application cannot handle node kind "${request.nodeKind}".`);
    }
  }
}
