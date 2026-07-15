import { EXECUTION_ADAPTER_KINDS } from '../types.js';
import type {
  ExecutionAdapter,
  ExecutionAdapterRequest,
  ExecutionAdapterResult,
} from '../types.js';

export interface NativeBinaryExecutionAdapterOptions {
  readonly binaryPath?: string;
}

export class NativeBinaryExecutionAdapter implements ExecutionAdapter {
  readonly kind = EXECUTION_ADAPTER_KINDS.NATIVE_BINARY;

  constructor(private readonly options: NativeBinaryExecutionAdapterOptions = {}) {}

  canHandle(request: ExecutionAdapterRequest): boolean {
    return request.nodeKind === 'extract-audio' || request.nodeKind === 'mux';
  }

  execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    const binaryPath = this.options.binaryPath ?? 'ffmpeg';
    const artifactPath = `${request.artifactRoot}/${request.nodeId}-native.json`;
    const content = JSON.stringify({
      adapter: EXECUTION_ADAPTER_KINDS.NATIVE_BINARY,
      binaryPath,
      nodeKind: request.nodeKind,
    });

    const write = request.artifactSink?.writeText(artifactPath, content) ?? Promise.resolve();

    return write.then(() => ({
      artifacts: { [request.nodeKind]: artifactPath },
      durationMs: 1,
    }));
  }
}
