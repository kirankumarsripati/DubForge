import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { DELIVERABLE_KINDS, DELIVERABLE_STATUSES } from '../domain/constants.js';
import type { Deliverable } from '../domain/deliverable.js';
import type {
  ExporterPort,
  ExportDeliverableInput,
  ExportedDeliverableResult,
} from '../ports/delivery-ports.js';

export class Exporter implements ExporterPort {
  async exportDeliverable(input: ExportDeliverableInput): Promise<ExportedDeliverableResult> {
    await mkdir(dirname(input.deliverable.outputPath), { recursive: true });

    const content = `EXPORTED:${input.deliverable.kind}:${input.sourcePath}`;
    await writeFile(input.deliverable.outputPath, content, 'utf8');

    const checksum = createHash('sha256').update(content).digest('hex');
    const trackCount =
      input.deliverable.kind === DELIVERABLE_KINDS.AUDIO_ONLY ? 1 : 1 + input.languageCodes.length;

    return {
      outputPath: input.deliverable.outputPath,
      sizeBytes: content.length,
      durationMs: 5000,
      checksum,
      languageTags: ['en', ...input.languageCodes],
      trackCount,
    };
  }
}

export function createExporter(exporterPort?: ExporterPort): ExporterPort {
  return exporterPort ?? new Exporter();
}

export function applyExportResult(
  deliverable: Deliverable,
  result: ExportedDeliverableResult,
): Deliverable {
  return {
    ...deliverable,
    outputPath: result.outputPath,
    status: DELIVERABLE_STATUSES.EXPORTING,
    checksum: result.checksum,
    sizeBytes: result.sizeBytes,
    durationMs: result.durationMs,
    languageTags: result.languageTags,
    trackCount: result.trackCount,
  };
}
