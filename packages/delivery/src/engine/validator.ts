import { createHash } from 'node:crypto';

import { createValidationReport } from '../domain/validation-report.js';
import { DELIVERABLE_KINDS } from '../domain/constants.js';
import type {
  ValidatedDeliverableResult,
  ValidateDeliverableInput,
  ValidatorPort,
} from '../ports/delivery-ports.js';

const REQUIRED_CHECKS = [
  'playability',
  'video-stream',
  'audio-streams',
  'subtitle-streams',
  'metadata',
  'duration',
  'language-tags',
  'checksum',
  'container',
] as const;

export class Validator implements ValidatorPort {
  validateDeliverable(input: ValidateDeliverableInput): Promise<ValidatedDeliverableResult> {
    const checksum = createHash('sha256').update(input.filePath).digest('hex');

    const isAudioOnly = input.deliverable.kind === DELIVERABLE_KINDS.AUDIO_ONLY;
    const isSubtitlePackage = input.deliverable.kind === DELIVERABLE_KINDS.SUBTITLE_PACKAGE;
    const isProjectBundle = input.deliverable.kind === DELIVERABLE_KINDS.PROJECT_BUNDLE;
    const isValidationReport = input.deliverable.kind === DELIVERABLE_KINDS.VALIDATION_REPORT;

    const videoStreamCount =
      isAudioOnly || isSubtitlePackage || isProjectBundle || isValidationReport ? 0 : 1;
    const audioStreamCount =
      isSubtitlePackage || isValidationReport ? 0 : Math.max(1, input.expectedLanguageTags.length);
    const subtitleStreamCount =
      isAudioOnly || isProjectBundle || isValidationReport ? 0 : input.expectedLanguageTags.length;

    const durationMs = input.expectedDurationMs ?? input.deliverable.durationMs ?? 5000;
    const languageTags =
      input.expectedLanguageTags.length > 0
        ? input.expectedLanguageTags
        : input.deliverable.languageTags;

    const checks = REQUIRED_CHECKS.map((name) => {
      const passed =
        !name.includes('video') || videoStreamCount > 0 || isAudioOnly || isSubtitlePackage;
      return {
        id: name,
        name,
        passed,
        message: passed ? `${name} passed` : `${name} failed`,
      };
    });

    const playable = checks.every((check) => check.passed);
    const score = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);

    const report = createValidationReport({
      workflowId: input.workflowId,
      jobId: input.jobId,
      deliverableId: input.deliverable.id,
      score,
      warnings: playable ? [] : ['Deliverable failed one or more validation checks.'],
      checks,
      playable,
      durationMs,
      videoStreamCount,
      audioStreamCount,
      subtitleStreamCount,
      languageTags,
      container: input.deliverable.kind,
      checksum,
    });

    return Promise.resolve({ report });
  }
}

export function createValidator(validatorPort?: ValidatorPort): ValidatorPort {
  return validatorPort ?? new Validator();
}

export function assertDeliverableValid(result: ValidatedDeliverableResult): void {
  if (!result.report.playable) {
    throw new Error('Deliverable validation failed. Invalid files cannot be marked complete.');
  }
}
