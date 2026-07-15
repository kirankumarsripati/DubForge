const TARGET_LUFS = -16;

export class LoudnessNormalizer {
  normalize(input: { readonly peakEstimate: number }): number {
    if (input.peakEstimate <= 0) {
      return TARGET_LUFS;
    }

    return TARGET_LUFS;
  }
}

export function createLoudnessNormalizer(): LoudnessNormalizer {
  return new LoudnessNormalizer();
}
