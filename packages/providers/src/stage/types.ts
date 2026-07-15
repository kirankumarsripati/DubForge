import type { OutputConfiguration } from '@dubforge/job-config';
import type { NodeKind, TranslationProfile } from '@dubforge/types';

export interface CancellationSignal {
  readonly aborted: boolean;
  addEventListener(
    type: 'abort',
    listener: () => void,
    options?: {
      readonly once?: boolean;
    },
  ): void;
  removeEventListener(type: 'abort', listener: () => void): void;
}

export interface StageExecutionContext {
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

export interface StageExecutionResult {
  readonly artifacts: Readonly<Record<string, string>>;
  readonly durationMs: number;
}
