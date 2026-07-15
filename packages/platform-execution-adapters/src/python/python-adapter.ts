import {
  EXECUTION_ADAPTER_KINDS,
  type ExecutionAdapter,
  type ExecutionAdapterRequest,
  type ExecutionAdapterResult,
} from '../types.js';

export interface PythonExecutionAdapterOptions {
  readonly pythonPath?: string;
}

export class PythonExecutionAdapter implements ExecutionAdapter {
  readonly kind = EXECUTION_ADAPTER_KINDS.PYTHON;

  constructor(private readonly options: PythonExecutionAdapterOptions = {}) {}

  canHandle(_request: ExecutionAdapterRequest): boolean {
    return false;
  }

  execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    const pythonPath = this.options.pythonPath ?? 'python3';
    const artifactPath = `${request.artifactRoot}/${request.nodeId}-python.json`;
    const content = JSON.stringify({
      adapter: EXECUTION_ADAPTER_KINDS.PYTHON,
      pythonPath,
      nodeKind: request.nodeKind,
    });

    const write = request.artifactSink?.writeText(artifactPath, content) ?? Promise.resolve();

    return write.then(() => ({
      artifacts: { [request.nodeKind]: artifactPath },
      durationMs: 1,
    }));
  }
}
