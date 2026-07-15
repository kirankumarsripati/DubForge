import type { OutputConfiguration } from '@dubforge/job-config';
import type { NodeKind, TranslationProfile } from '@dubforge/types';

export const EXECUTION_ADAPTER_KINDS = {
  NODE: 'node',
  PYTHON: 'python',
  NATIVE_BINARY: 'native-binary',
  MEDIA: 'media',
  MOCK: 'mock',
} as const;

export type ExecutionAdapterKind =
  (typeof EXECUTION_ADAPTER_KINDS)[keyof typeof EXECUTION_ADAPTER_KINDS];

export interface CancellationSignal {
  readonly aborted: boolean;
  addEventListener(
    type: 'abort',
    listener: () => void,
    options?: { readonly once?: boolean },
  ): void;
}

export interface ArtifactSink {
  writeText(path: string, content: string): Promise<void>;
}

export interface ExecutionAdapterRequest {
  readonly executionId: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly nodeKind: NodeKind;
  readonly languageCode: string | null;
  readonly videoPath: string;
  readonly videoFilename: string;
  readonly durationSeconds: number;
  readonly profile: TranslationProfile;
  readonly output: OutputConfiguration;
  readonly outputDirectory: string;
  readonly artifactRoot: string;
  readonly artifacts: Readonly<Record<string, string>>;
  readonly artifactSink?: ArtifactSink;
  readonly signal: CancellationSignal;
  readonly onProgress: (progress: number) => void;
}

export interface ExecutionAdapterResult {
  readonly artifacts: Readonly<Record<string, string>>;
  readonly durationMs: number;
}

export interface ExecutionAdapter {
  readonly kind: ExecutionAdapterKind;
  canHandle(request: ExecutionAdapterRequest): boolean;
  execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult>;
}
