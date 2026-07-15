import type { OutputConfiguration } from '@dubforge/job-config';
import type { NodeKind, TranslationProfile } from '@dubforge/types';

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

export interface NodeExecutionRequest {
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
  readonly signal: CancellationSignal;
  readonly onProgress: (progress: number) => void;
}

export interface NodeExecutionResult {
  readonly artifacts: Readonly<Record<string, string>>;
  readonly durationMs: number;
}

export interface NodeExecutionPort {
  execute(request: NodeExecutionRequest): Promise<NodeExecutionResult>;
}

export const EXECUTION_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMED_OUT: 'timed-out',
} as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[keyof typeof EXECUTION_STATUSES];

export interface ActiveExecution {
  readonly executionId: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly status: ExecutionStatus;
  readonly adapterKind: string;
  readonly startedAt: string;
  readonly timeoutMs: number;
}
