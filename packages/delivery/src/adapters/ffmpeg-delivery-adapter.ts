import { readFile } from 'node:fs/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { createValidationReport } from '../domain/validation-report.js';
import type {
  ExportedDeliverableResult,
  ExportDeliverableInput,
  ExporterPort,
  ValidatedDeliverableResult,
  ValidateDeliverableInput,
  ValidatorPort,
} from '../ports/delivery-ports.js';
import { Exporter } from '../engine/exporter.js';
import { Validator } from '../engine/validator.js';

interface FixtureValidationPayload {
  readonly durationMs: number;
  readonly videoStreamCount: number;
  readonly audioStreamCount: number;
  readonly subtitleStreamCount: number;
  readonly languageTags: readonly string[];
  readonly container: string;
  readonly playable: boolean;
  readonly score: number;
}

export class FfmpegDeliveryAdapter implements ExporterPort {
  private readonly delegate = new Exporter();

  exportDeliverable(input: ExportDeliverableInput): Promise<ExportedDeliverableResult> {
    return this.delegate.exportDeliverable(input);
  }
}

export class FfmpegValidatorAdapter implements ValidatorPort {
  private readonly delegate = new Validator();

  validateDeliverable(input: ValidateDeliverableInput): Promise<ValidatedDeliverableResult> {
    return this.delegate.validateDeliverable(input);
  }
}

export class FixtureFfmpegDeliveryAdapter implements ExporterPort {
  constructor(private readonly options: { readonly fixturePath: string }) {}

  async exportDeliverable(input: ExportDeliverableInput): Promise<ExportedDeliverableResult> {
    const payload = JSON.parse(
      await readFile(this.options.fixturePath, 'utf8'),
    ) as ExportedDeliverableResult;

    await mkdir(dirname(input.deliverable.outputPath), { recursive: true });
    await writeFile(
      input.deliverable.outputPath,
      `EXPORTED:${input.deliverable.kind}:${String(payload.durationMs)}`,
      'utf8',
    );

    return {
      outputPath: input.deliverable.outputPath,
      sizeBytes: payload.sizeBytes,
      durationMs: payload.durationMs,
      checksum: payload.checksum,
      languageTags: payload.languageTags,
      trackCount: payload.trackCount,
    };
  }
}

export class FixtureFfmpegValidatorAdapter implements ValidatorPort {
  constructor(private readonly options: { readonly fixturePath: string }) {}

  async validateDeliverable(input: ValidateDeliverableInput): Promise<ValidatedDeliverableResult> {
    const payload = JSON.parse(
      await readFile(this.options.fixturePath, 'utf8'),
    ) as FixtureValidationPayload;

    const report = createValidationReport({
      workflowId: input.workflowId,
      jobId: input.jobId,
      deliverableId: input.deliverable.id,
      score: payload.score,
      warnings: payload.playable ? [] : ['Fixture validation reported a failure.'],
      checks: [
        {
          id: 'playability',
          name: 'playability',
          passed: payload.playable,
          message: payload.playable ? 'playability passed' : 'playability failed',
        },
      ],
      playable: payload.playable,
      durationMs: payload.durationMs,
      videoStreamCount: payload.videoStreamCount,
      audioStreamCount: payload.audioStreamCount,
      subtitleStreamCount: payload.subtitleStreamCount,
      languageTags: payload.languageTags,
      container: payload.container,
      checksum: input.deliverable.checksum,
    });

    return { report };
  }
}
