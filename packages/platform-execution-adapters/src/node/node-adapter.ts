import { EXECUTION_ADAPTER_KINDS } from '../types.js';
import type {
  ExecutionAdapter,
  ExecutionAdapterRequest,
  ExecutionAdapterResult,
} from '../types.js';

export interface NodeExecutionAdapterOptions {
  readonly scriptPath?: string;
}

export class NodeExecutionAdapter implements ExecutionAdapter {
  readonly kind = EXECUTION_ADAPTER_KINDS.NODE;

  constructor(private readonly options: NodeExecutionAdapterOptions = {}) {}

  canHandle(request: ExecutionAdapterRequest): boolean {
    return request.nodeKind === 'validate';
  }

  execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    const scriptPath = this.options.scriptPath ?? 'node';
    const artifactPath = `${request.artifactRoot}/${request.nodeId}-node.json`;
    const content = JSON.stringify({
      adapter: EXECUTION_ADAPTER_KINDS.NODE,
      scriptPath,
      nodeKind: request.nodeKind,
    });

    const write = request.artifactSink?.writeText(artifactPath, content) ?? Promise.resolve();

    return write.then(() => ({
      artifacts: { [request.nodeKind]: artifactPath },
      durationMs: 1,
    }));
  }
}
