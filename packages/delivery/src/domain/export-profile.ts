import type { DeliverableKind } from './constants.js';

export interface ExportProfileDeliverableSpec {
  readonly kind: DeliverableKind;
  readonly container: string | null;
  readonly embedSubtitles: boolean;
  readonly exportSrt: boolean;
  readonly exportTranscript: boolean;
  readonly includeProjectBundle: boolean;
  readonly includeValidationReport: boolean;
}

export interface ExportProfile {
  readonly id: string;
  readonly label: string;
  readonly version: string;
  readonly deliverables: readonly ExportProfileDeliverableSpec[];
}

export function createExportProfile(input: ExportProfile): ExportProfile {
  return { ...input };
}

export function serializeExportProfile(profile: ExportProfile): string {
  return JSON.stringify(profile, null, 2);
}

export function deserializeExportProfile(content: string): ExportProfile {
  const parsed = JSON.parse(content) as ExportProfile;
  if (typeof parsed.id !== 'string' || typeof parsed.version !== 'string') {
    throw new Error('Invalid export profile document.');
  }
  return parsed;
}
