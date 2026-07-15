import type { TranslationProfile } from '@dubforge/types';

const BASE_DURATIONS_MS: Readonly<Record<string, number>> = {
  validate: 120,
  fingerprint: 180,
  metadata: 150,
  'extract-audio': 400,
  'speech-recognition': 1200,
  'english-transcript': 200,
  'english-subtitle': 180,
  translate: 500,
  subtitle: 220,
  speech: 900,
  align: 300,
  mux: 600,
  verify: 250,
  manifest: 120,
};

const PROFILE_MULTIPLIERS: Readonly<Record<TranslationProfile, number>> = {
  fast: 0.6,
  balanced: 1,
  studio: 1.8,
};

export function getSimulatedDurationMs(
  nodeKind: string,
  profile: TranslationProfile,
  durationSeconds: number,
): number {
  const base = BASE_DURATIONS_MS[nodeKind] ?? 200;
  const profileMultiplier = PROFILE_MULTIPLIERS[profile];
  const durationFactor = Math.min(2, Math.max(0.5, durationSeconds / 300));
  return Math.round(base * profileMultiplier * durationFactor);
}

import type { CancellationSignal } from '../stage/types';

export function sleep(ms: number, signal: CancellationSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('Operation cancelled.'));
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = (): void => {
      cleanup();
      reject(new Error('Operation cancelled.'));
    };

    const cleanup = (): void => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export async function simulateWork(
  nodeKind: string,
  profile: TranslationProfile,
  durationSeconds: number,
  signal: CancellationSignal,
  onProgress: (progress: number) => void,
): Promise<number> {
  const totalMs = getSimulatedDurationMs(nodeKind, profile, durationSeconds);
  const steps = 5;
  const stepMs = Math.max(20, Math.floor(totalMs / steps));

  for (let step = 1; step <= steps; step += 1) {
    await sleep(stepMs, signal);
    onProgress(Math.round((step / steps) * 100));
  }

  return totalMs;
}
