import type { CanonicalTranscript } from '@dubforge/transcription';

import type { GlossaryEntry } from '../ports/localization-ports.js';

export interface LocalizationEngineInput {
  readonly source: CanonicalTranscript;
  readonly targetLanguageCode: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly glossaryEntries: readonly GlossaryEntry[];
  readonly onProgress: (progress: number) => void;
}
