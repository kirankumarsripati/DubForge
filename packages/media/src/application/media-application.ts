import type {
  ExecutionAdapterRequest,
  ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import { ExtractAudioService, MuxMediaService, ProbeMediaService } from './media-services.js';

const MEDIA_NODE_KINDS = new Set<NodeKind>([
  NODE_KINDS.METADATA,
  NODE_KINDS.EXTRACT_AUDIO,
  NODE_KINDS.MUX,
]);

export class MediaApplication {
  constructor(
    private readonly probeService: ProbeMediaService,
    private readonly extractService: ExtractAudioService,
    private readonly muxService: MuxMediaService,
  ) {}

  canHandle(nodeKind: NodeKind): boolean {
    return MEDIA_NODE_KINDS.has(nodeKind);
  }

  async executeNode(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    switch (request.nodeKind) {
      case NODE_KINDS.METADATA:
        return this.probeService.probeForWorkflow({
          filePath: request.videoPath,
          filename: request.videoFilename,
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          artifactRoot: request.artifactRoot,
          artifactSink: request.artifactSink,
        });
      case NODE_KINDS.EXTRACT_AUDIO:
        return this.extractService.extractForWorkflow({
          filePath: request.videoPath,
          filename: request.videoFilename,
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          artifactRoot: request.artifactRoot,
          artifactSink: request.artifactSink,
          onProgress: request.onProgress,
        });
      case NODE_KINDS.MUX:
        return this.muxService.muxForWorkflow({
          videoPath: request.videoPath,
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          artifactRoot: request.artifactRoot,
          artifacts: request.artifacts,
          artifactSink: request.artifactSink,
          onProgress: request.onProgress,
        });
      default:
        throw new Error(`Media application cannot handle node kind "${request.nodeKind}".`);
    }
  }
}
