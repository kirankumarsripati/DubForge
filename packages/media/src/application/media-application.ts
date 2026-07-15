import type {
  ExecutionAdapterRequest,
  ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import { ExtractAudioService, MuxMediaService, ProbeMediaService } from './media-services.js';
import { FingerprintMediaService } from './fingerprint-media-service.js';
import { ValidateMediaService } from './validate-media-service.js';

function parseImportArtifactNumber(
  artifacts: Readonly<Record<string, string>>,
  key: string,
): number | null {
  const value = artifacts[key];
  if (value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const MEDIA_NODE_KINDS = new Set<NodeKind>([
  NODE_KINDS.VALIDATE,
  NODE_KINDS.FINGERPRINT,
  NODE_KINDS.METADATA,
  NODE_KINDS.EXTRACT_AUDIO,
  NODE_KINDS.MUX,
]);

export class MediaApplication {
  constructor(
    private readonly validateService: ValidateMediaService,
    private readonly fingerprintService: FingerprintMediaService,
    private readonly probeService: ProbeMediaService,
    private readonly extractService: ExtractAudioService,
    private readonly muxService: MuxMediaService,
  ) {}

  canHandle(nodeKind: NodeKind): boolean {
    return MEDIA_NODE_KINDS.has(nodeKind);
  }

  async executeNode(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    switch (request.nodeKind) {
      case NODE_KINDS.VALIDATE:
        return this.validateService.validateForWorkflow({
          filePath: request.videoPath,
          filename: request.videoFilename,
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          artifactRoot: request.artifactRoot,
          artifactSink: request.artifactSink,
          fileSizeBytes: parseImportArtifactNumber(request.artifacts, '__import_file_size') ?? 0,
          fileModifiedAtMs:
            parseImportArtifactNumber(request.artifacts, '__import_file_modified') ?? 0,
        });
      case NODE_KINDS.FINGERPRINT:
        return this.fingerprintService.fingerprintForWorkflow({
          filePath: request.videoPath,
          filename: request.videoFilename,
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          artifactRoot: request.artifactRoot,
          artifactSink: request.artifactSink,
          fileSizeBytes: parseImportArtifactNumber(request.artifacts, '__import_file_size') ?? 0,
          fileModifiedAtMs:
            parseImportArtifactNumber(request.artifacts, '__import_file_modified') ?? 0,
        });
      case NODE_KINDS.METADATA:
        return this.probeService.probeForWorkflow({
          filePath: request.videoPath,
          filename: request.videoFilename,
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          artifactRoot: request.artifactRoot,
          artifactSink: request.artifactSink,
          fileSizeBytes: parseImportArtifactNumber(request.artifacts, '__import_file_size'),
          fileModifiedAtMs: parseImportArtifactNumber(request.artifacts, '__import_file_modified'),
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
