import type { PronunciationEntry } from '../ports/voice-performance-ports.js';

export class PronunciationResolver {
  constructor(private readonly entries: readonly PronunciationEntry[] = []) {}

  resolve(text: string, languageCode: string): string {
    let resolved = text;

    for (const entry of this.entries) {
      if (entry.languageCode !== languageCode || entry.term.length === 0) {
        continue;
      }

      resolved = resolved.split(entry.term).join(entry.pronunciation);
    }

    return resolved;
  }
}

export function createPronunciationResolver(
  entries: readonly PronunciationEntry[] = [],
): PronunciationResolver {
  return new PronunciationResolver(entries);
}
