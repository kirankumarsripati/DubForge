import { randomUUID } from 'node:crypto';

export interface ValidationCheck {
  readonly id: string;
  readonly name: string;
  readonly passed: boolean;
  readonly message: string;
}

export interface ValidationReport {
  readonly id: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly deliverableId: string;
  readonly score: number;
  readonly warnings: readonly string[];
  readonly checks: readonly ValidationCheck[];
  readonly playable: boolean;
  readonly durationMs: number | null;
  readonly videoStreamCount: number;
  readonly audioStreamCount: number;
  readonly subtitleStreamCount: number;
  readonly languageTags: readonly string[];
  readonly container: string | null;
  readonly checksum: string | null;
  readonly createdAt: string;
}

export function createValidationReport(input: {
  readonly workflowId: string;
  readonly jobId: string;
  readonly deliverableId: string;
  readonly score: number;
  readonly warnings?: readonly string[];
  readonly checks: readonly ValidationCheck[];
  readonly playable: boolean;
  readonly durationMs?: number | null;
  readonly videoStreamCount: number;
  readonly audioStreamCount: number;
  readonly subtitleStreamCount: number;
  readonly languageTags?: readonly string[];
  readonly container?: string | null;
  readonly checksum?: string | null;
}): ValidationReport {
  return {
    id: randomUUID(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    deliverableId: input.deliverableId,
    score: input.score,
    warnings: input.warnings ?? [],
    checks: input.checks,
    playable: input.playable,
    durationMs: input.durationMs ?? null,
    videoStreamCount: input.videoStreamCount,
    audioStreamCount: input.audioStreamCount,
    subtitleStreamCount: input.subtitleStreamCount,
    languageTags: input.languageTags ?? [],
    container: input.container ?? null,
    checksum: input.checksum ?? null,
    createdAt: new Date().toISOString(),
  };
}

export function serializeValidationReport(report: ValidationReport): string {
  return JSON.stringify(report, null, 2);
}

export function deserializeValidationReport(content: string): ValidationReport {
  return JSON.parse(content) as ValidationReport;
}
