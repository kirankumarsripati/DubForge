import type { FfprobeDiagnostics } from '@dubforge/shared';

import type { MediaFile } from '../domain/entities/media-entities.js';
import type { Duration } from '../domain/value-objects/duration.js';
import type { Resolution } from '../domain/value-objects/resolution.js';
import type { Codec } from '../domain/value-objects/codec.js';
import type { ContainerFormat } from '../domain/value-objects/container-format.js';

export interface ProbeMediaInput {
  readonly filePath: string;
  readonly filename: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly artifactRoot: string;
}

export interface ProbeMediaResult {
  readonly mediaFile: MediaFile;
  readonly artifactPath: string;
  readonly probeJson: string;
  readonly durationMs: number;
  readonly diagnostics?: FfprobeDiagnostics;
}

export interface ProbeMediaPort {
  probe(input: ProbeMediaInput): Promise<ProbeMediaResult>;
}

export interface ExtractAudioInput {
  readonly filePath: string;
  readonly filename: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly artifactRoot: string;
  readonly outputPath: string;
  readonly onProgress: (progress: number) => void;
}

export interface ExtractAudioResult {
  readonly audioPath: string;
  readonly artifactPath: string;
  readonly durationMs: number;
}

export interface ExtractAudioPort {
  extract(input: ExtractAudioInput): Promise<ExtractAudioResult>;
}

export interface MuxMediaInput {
  readonly videoPath: string;
  readonly audioPath: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly artifactRoot: string;
  readonly outputPath: string;
  readonly onProgress: (progress: number) => void;
}

export interface MuxMediaResult {
  readonly outputPath: string;
  readonly artifactPath: string;
  readonly durationMs: number;
}

export interface MuxMediaPort {
  mux(input: MuxMediaInput): Promise<MuxMediaResult>;
}

export interface MediaProbeSnapshot {
  readonly container: ContainerFormat;
  readonly duration: Duration;
  readonly resolution: Resolution;
  readonly videoCodec: Codec;
  readonly audioTrackCount: number;
  readonly bitrateKbps: number;
}
