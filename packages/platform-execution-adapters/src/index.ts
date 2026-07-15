export {
  EXECUTION_ADAPTER_KINDS,
  type ArtifactSink,
  type CancellationSignal,
  type ExecutionAdapter,
  type ExecutionAdapterKind,
  type ExecutionAdapterRequest,
  type ExecutionAdapterResult,
} from './types.js';

export { MockExecutionAdapter } from './mock/mock-adapter.js';
export { NodeExecutionAdapter, type NodeExecutionAdapterOptions } from './node/node-adapter.js';
export {
  PythonExecutionAdapter,
  type PythonExecutionAdapterOptions,
} from './python/python-adapter.js';
export {
  BinaryProcessError,
  formatBinaryCommand,
  formatBinaryDiagnostics,
  runBinaryProcess,
  type BinaryProcessDiagnostics,
  type RunBinaryProcessOptions,
  type RunBinaryProcessResult,
} from './native-binary/binary-process-runner.js';

export {
  NativeBinaryExecutionAdapter,
  type NativeBinaryExecutionAdapterOptions,
} from './native-binary/native-binary-adapter.js';

export { probeVideoFile, runFfprobe } from './native-binary/ffprobe-runner.js';

export { ExecutionAdapterRegistry, createDefaultAdapterRegistry } from './registry.js';
