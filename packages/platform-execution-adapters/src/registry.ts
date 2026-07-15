import { MockExecutionAdapter } from './mock/mock-adapter.js';
import { NativeBinaryExecutionAdapter } from './native-binary/native-binary-adapter.js';
import { NodeExecutionAdapter } from './node/node-adapter.js';
import { PythonExecutionAdapter } from './python/python-adapter.js';
import { EXECUTION_ADAPTER_KINDS } from './types.js';
import type { ExecutionAdapter, ExecutionAdapterRequest } from './types.js';

export class ExecutionAdapterRegistry {
  private readonly adapters: ExecutionAdapter[];

  constructor(adapters: readonly ExecutionAdapter[]) {
    this.adapters = [...adapters];
  }

  resolve(request: ExecutionAdapterRequest): ExecutionAdapter {
    const specific = this.adapters.find(
      (adapter) => adapter.kind !== EXECUTION_ADAPTER_KINDS.MOCK && adapter.canHandle(request),
    );
    if (specific !== undefined) {
      return specific;
    }

    const fallback = this.adapters.find((adapter) => adapter.kind === EXECUTION_ADAPTER_KINDS.MOCK);
    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error(`No execution adapter available for node kind: ${request.nodeKind}`);
  }

  list(): readonly ExecutionAdapter[] {
    return this.adapters;
  }
}

export function createDefaultAdapterRegistry(): ExecutionAdapterRegistry {
  return new ExecutionAdapterRegistry([
    new NodeExecutionAdapter(),
    new PythonExecutionAdapter(),
    new NativeBinaryExecutionAdapter(),
    new MockExecutionAdapter(),
  ]);
}
