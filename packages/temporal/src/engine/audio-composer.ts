import type {
  AudioComposerPort,
  ComposeLayersInput,
  ComposedAudioResult,
} from '../ports/temporal-ports.js';

export class AudioComposer {
  constructor(private readonly composerPort: AudioComposerPort) {}

  compose(input: ComposeLayersInput): Promise<ComposedAudioResult> {
    return this.composerPort.composeLayers(input);
  }
}

export function createAudioComposer(composerPort: AudioComposerPort): AudioComposer {
  return new AudioComposer(composerPort);
}
