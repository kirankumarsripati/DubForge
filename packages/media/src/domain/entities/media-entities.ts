import type { MediaOperationKind, MediaOperationStatus } from '../constants.js';
import type { Duration } from '../value-objects/duration.js';
import type { Resolution } from '../value-objects/resolution.js';
import type { Codec } from '../value-objects/codec.js';
import type { ContainerFormat } from '../value-objects/container-format.js';

export interface MediaFile {
  readonly id: string;
  readonly filePath: string;
  readonly filename: string;
  readonly container: ContainerFormat;
  readonly duration: Duration;
  readonly resolution: Resolution;
  readonly videoCodec: Codec;
  readonly audioTrackCount: number;
  readonly bitrateKbps: number;
  readonly probedAt: string;
  readonly workflowId: string | null;
  readonly jobId: string | null;
}

export interface MediaStream {
  readonly id: string;
  readonly mediaFileId: string;
  readonly kind: 'video' | 'audio';
  readonly codec: Codec;
  readonly index: number;
  readonly resolution: Resolution | null;
  readonly frameRate: number | null;
}

export interface MediaOperation {
  readonly id: string;
  readonly kind: MediaOperationKind;
  readonly mediaFileId: string | null;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly status: MediaOperationStatus;
  readonly artifactPath: string | null;
  readonly durationMs: number | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly errorMessage: string | null;
}
