import type {
  ExecutionAdapterRequest,
  ExecutionAdapterResult,
} from '@dubforge/platform-execution-adapters';
import { NODE_KINDS, type NodeKind } from '@dubforge/types';

import { BuildSubtitleService, TranslateDocumentService } from './localization-services.js';

const LOCALIZATION_NODE_KINDS = new Set<NodeKind>([
  NODE_KINDS.TRANSLATE,
  NODE_KINDS.SUBTITLE,
  NODE_KINDS.ENGLISH_SUBTITLE,
]);

export class LocalizationApplication {
  constructor(
    private readonly translateService: TranslateDocumentService,
    private readonly subtitleService: BuildSubtitleService,
  ) {}

  canHandle(nodeKind: NodeKind): boolean {
    return LOCALIZATION_NODE_KINDS.has(nodeKind);
  }

  async executeNode(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    switch (request.nodeKind) {
      case NODE_KINDS.TRANSLATE:
        return this.translateService.translateForWorkflow({
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          languageCode: request.languageCode,
          artifactRoot: request.artifactRoot,
          artifactSink: request.artifactSink,
          onProgress: request.onProgress,
        });
      case NODE_KINDS.SUBTITLE:
        return this.subtitleService.buildLocalizedSubtitle({
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          languageCode: request.languageCode,
          artifactRoot: request.artifactRoot,
          artifactSink: request.artifactSink,
          onProgress: request.onProgress,
        });
      case NODE_KINDS.ENGLISH_SUBTITLE:
        return this.subtitleService.buildEnglishSubtitle({
          workflowId: request.workflowId,
          jobId: request.jobId,
          nodeId: request.nodeId,
          artifactRoot: request.artifactRoot,
          artifactSink: request.artifactSink,
          onProgress: request.onProgress,
        });
      default:
        throw new Error(`Localization application cannot handle node kind "${request.nodeKind}".`);
    }
  }
}
