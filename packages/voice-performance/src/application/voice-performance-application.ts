import type {
  ExecutionAdapterRequest,
  ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import { AlignSpeechService, SynthesizeSpeechService } from './voice-performance-services.js';

const VOICE_PERFORMANCE_NODE_KINDS = new Set<NodeKind>([NODE_KINDS.SPEECH, NODE_KINDS.ALIGN]);

export class VoicePerformanceApplication {
  constructor(
    private readonly synthesizeService: SynthesizeSpeechService,
    private readonly alignService: AlignSpeechService,
  ) {}

  canHandle(nodeKind: NodeKind): boolean {
    return VOICE_PERFORMANCE_NODE_KINDS.has(nodeKind);
  }

  async executeNode(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    switch (request.nodeKind) {
      case NODE_KINDS.SPEECH:
        return this.synthesizeService.synthesizeForWorkflow({
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          languageCode: request.languageCode,
          artifactRoot: request.artifactRoot,
          artifactSink: request.artifactSink,
          onProgress: request.onProgress,
        });
      case NODE_KINDS.ALIGN:
        return this.alignService.alignForWorkflow({
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
          `Voice performance application cannot handle node kind "${request.nodeKind}".`,
        );
    }
  }
}
