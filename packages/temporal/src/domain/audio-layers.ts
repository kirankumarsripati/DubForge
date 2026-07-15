export interface AudioLayers {
  readonly speech: string;
  readonly background: string | null;
  readonly composed: string;
}

export function createAudioLayers(input: {
  readonly speech: string;
  readonly background: string | null;
  readonly composed: string;
}): AudioLayers {
  return {
    speech: input.speech,
    background: input.background,
    composed: input.composed,
  };
}
