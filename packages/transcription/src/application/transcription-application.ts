import type {
  ExecutionAdapterRequest,
  ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import { BuildTranscriptService, RecognizeSpeechService } from './transcription-services.js';

const TRANSCRIPTION_NODE_KINDS = new Set<NodeKind>([
  NODE_KINDS.SPEECH_RECOGNITION,
  NODE_KINDS.ENGLISH_TRANSCRIPT,
]);

export class TranscriptionApplication {
  constructor(
    private readonly recognizeService: RecognizeSpeechService,
    private readonly buildService: BuildTranscriptService,
  ) {}

  canHandle(nodeKind: NodeKind): boolean {
    return TRANSCRIPTION_NODE_KINDS.has(nodeKind);
  }

  async executeNode(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    switch (request.nodeKind) {
      case NODE_KINDS.SPEECH_RECOGNITION:
        return this.recognizeService.recognizeForWorkflow({
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          artifactRoot: request.artifactRoot,
          artifacts: request.artifacts,
          durationSeconds: request.durationSeconds,
          artifactSink: request.artifactSink,
          onProgress: request.onProgress,
        });
      case NODE_KINDS.ENGLISH_TRANSCRIPT:
        return this.buildService.buildForWorkflow({
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          artifactRoot: request.artifactRoot,
          artifactSink: request.artifactSink,
          onProgress: request.onProgress,
        });
      default:
        throw new Error(`Transcription application cannot handle node kind "${request.nodeKind}".`);
    }
  }
}
