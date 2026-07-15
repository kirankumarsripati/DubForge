import { randomUUID } from 'node:crypto';

import type { DeliverableKind, DeliverableStatus } from './constants.js';
import { DELIVERABLE_STATUSES } from './constants.js';

export interface Deliverable {
  readonly id: string;
  readonly kind: DeliverableKind;
  readonly label: string;
  readonly outputPath: string;
  readonly sourceArtifactKey: string | null;
  readonly status: DeliverableStatus;
  readonly checksum: string | null;
  readonly sizeBytes: number | null;
  readonly durationMs: number | null;
  readonly languageTags: readonly string[];
  readonly trackCount: number | null;
  readonly createdAt: string;
}

export function createDeliverable(input: {
  readonly kind: DeliverableKind;
  readonly label: string;
  readonly outputPath: string;
  readonly sourceArtifactKey?: string | null;
  readonly status?: DeliverableStatus;
  readonly checksum?: string | null;
  readonly sizeBytes?: number | null;
  readonly durationMs?: number | null;
  readonly languageTags?: readonly string[];
  readonly trackCount?: number | null;
}): Deliverable {
  return {
    id: randomUUID(),
    kind: input.kind,
    label: input.label,
    outputPath: input.outputPath,
    sourceArtifactKey: input.sourceArtifactKey ?? null,
    status: input.status ?? DELIVERABLE_STATUSES.PLANNED,
    checksum: input.checksum ?? null,
    sizeBytes: input.sizeBytes ?? null,
    durationMs: input.durationMs ?? null,
    languageTags: input.languageTags ?? [],
    trackCount: input.trackCount ?? null,
    createdAt: new Date().toISOString(),
  };
}

export function serializeDeliverable(deliverable: Deliverable): string {
  return JSON.stringify(deliverable, null, 2);
}

export function deserializeDeliverable(content: string): Deliverable {
  return JSON.parse(content) as Deliverable;
}
