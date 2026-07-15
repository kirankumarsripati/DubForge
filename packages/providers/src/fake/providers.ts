import { NODE_KINDS, type NodeKind } from '@dubforge/types';
import type { PipelineStageCapabilityHandler } from '../capabilities/pipeline-stage';
import type { StageExecutionContext, StageExecutionResult } from '../stage/types';
import { createPlaceholderJson, writePlaceholderArtifact } from './artifact-writer';
import { simulateWork } from './timing';

function createBaseProvider(
  nodeKind: NodeKind,
  artifactKey: string,
  relativePath: string,
  buildContent: (context: StageExecutionContext) => string,
): PipelineStageCapabilityHandler {
  return {
    initialize(): Promise<void> {
      return Promise.resolve();
    },
    async execute(context: StageExecutionContext): Promise<StageExecutionResult> {
      const startedAt = Date.now();
      const durationMs = await simulateWork(
        nodeKind,
        context.profile,
        context.durationSeconds,
        context.signal,
        context.onProgress,
      );

      const absolutePath = await writePlaceholderArtifact(
        context.artifactRoot,
        relativePath,
        buildContent(context),
      );

      return {
        artifacts: { [artifactKey]: absolutePath },
        durationMs: Date.now() - startedAt || durationMs,
      };
    },
    validate(result: StageExecutionResult): Promise<void> {
      if (Object.keys(result.artifacts).length === 0) {
        return Promise.reject(new Error(`Provider "${nodeKind}" produced no artifacts.`));
      }
      return Promise.resolve();
    },
    cleanup(): Promise<void> {
      return Promise.resolve();
    },
  };
}

export function createFakeValidateProvider(): PipelineStageCapabilityHandler {
  return createBaseProvider(NODE_KINDS.VALIDATE, 'validation', 'validation.json', (context) =>
    createPlaceholderJson('validation', {
      videoPath: context.videoPath,
      filename: context.videoFilename,
      valid: true,
    }),
  );
}

export function createFakeFingerprintProvider(): PipelineStageCapabilityHandler {
  return createBaseProvider(NODE_KINDS.FINGERPRINT, 'fingerprint', 'video.hash', (context) =>
    createPlaceholderJson('fingerprint', {
      algorithm: 'sha256',
      hash: `placeholder-${context.videoFilename}`,
    }),
  );
}

export function createFakeMetadataProvider(): PipelineStageCapabilityHandler {
  return createBaseProvider(NODE_KINDS.METADATA, 'metadata', 'metadata.json', (context) =>
    createPlaceholderJson('metadata', {
      durationSeconds: context.durationSeconds,
      codec: 'h264',
      resolution: '1920x1080',
    }),
  );
}

export function createFakeExtractAudioProvider(): PipelineStageCapabilityHandler {
  return createBaseProvider(
    NODE_KINDS.EXTRACT_AUDIO,
    'audio',
    'audio.wav',
    () => 'PLACEHOLDER_PCM_AUDIO',
  );
}

export function createFakeSpeechRecognitionProvider(): PipelineStageCapabilityHandler {
  return createBaseProvider(
    NODE_KINDS.SPEECH_RECOGNITION,
    'transcript',
    'transcript.json',
    (context) =>
      createPlaceholderJson('transcript', {
        segments: [
          { start: 0, end: 2.5, text: 'Hello world.', language: 'en', confidence: 0.95 },
          {
            start: 2.5,
            end: 5,
            text: 'This is a placeholder transcript.',
            language: 'en',
            confidence: 0.92,
          },
        ],
        durationSeconds: context.durationSeconds,
      }),
  );
}

export function createFakeEnglishTranscriptProvider(): PipelineStageCapabilityHandler {
  return createBaseProvider(
    NODE_KINDS.ENGLISH_TRANSCRIPT,
    'englishTranscript',
    'english.txt',
    () => 'Hello world.\n\nThis is a placeholder transcript.',
  );
}

export function createFakeEnglishSubtitleProvider(): PipelineStageCapabilityHandler {
  return createBaseProvider(NODE_KINDS.ENGLISH_SUBTITLE, 'englishSubtitle', 'english.srt', () =>
    [
      '1',
      '00:00:00,000 --> 00:00:02,500',
      'Hello world.',
      '',
      '2',
      '00:00:02,500 --> 00:00:05,000',
      'This is a placeholder transcript.',
      '',
    ].join('\n'),
  );
}

export function createFakeTranslateProvider(): PipelineStageCapabilityHandler {
  return {
    initialize(): Promise<void> {
      return Promise.resolve();
    },
    async execute(context: StageExecutionContext): Promise<StageExecutionResult> {
      const languageCode = context.languageCode ?? 'unknown';
      const startedAt = Date.now();
      const durationMs = await simulateWork(
        NODE_KINDS.TRANSLATE,
        context.profile,
        context.durationSeconds,
        context.signal,
        context.onProgress,
      );

      const relativePath = `${languageCode}.json`;
      const absolutePath = await writePlaceholderArtifact(
        context.artifactRoot,
        relativePath,
        createPlaceholderJson('translation', {
          languageCode,
          text: `Placeholder translation for ${languageCode}.`,
        }),
      );

      return {
        artifacts: { [`translation:${languageCode}`]: absolutePath },
        durationMs: Date.now() - startedAt || durationMs,
      };
    },
    validate(result: StageExecutionResult): Promise<void> {
      if (Object.keys(result.artifacts).length === 0) {
        return Promise.reject(new Error('Translation provider produced no artifacts.'));
      }
      return Promise.resolve();
    },
    cleanup(): Promise<void> {
      return Promise.resolve();
    },
  };
}

export function createFakeSubtitleProvider(): PipelineStageCapabilityHandler {
  return {
    initialize(): Promise<void> {
      return Promise.resolve();
    },
    async execute(context: StageExecutionContext): Promise<StageExecutionResult> {
      const languageCode = context.languageCode ?? 'unknown';
      const startedAt = Date.now();
      const durationMs = await simulateWork(
        NODE_KINDS.SUBTITLE,
        context.profile,
        context.durationSeconds,
        context.signal,
        context.onProgress,
      );

      const relativePath = `${languageCode}.srt`;
      const absolutePath = await writePlaceholderArtifact(
        context.artifactRoot,
        relativePath,
        ['1', '00:00:00,000 --> 00:00:02,500', `Placeholder ${languageCode} subtitle`, ''].join(
          '\n',
        ),
      );

      return {
        artifacts: { [`subtitle:${languageCode}`]: absolutePath },
        durationMs: Date.now() - startedAt || durationMs,
      };
    },
    validate(result: StageExecutionResult): Promise<void> {
      if (Object.keys(result.artifacts).length === 0) {
        return Promise.reject(new Error('Subtitle provider produced no artifacts.'));
      }
      return Promise.resolve();
    },
    cleanup(): Promise<void> {
      return Promise.resolve();
    },
  };
}

export function createFakeSpeechProvider(): PipelineStageCapabilityHandler {
  return {
    initialize(): Promise<void> {
      return Promise.resolve();
    },
    async execute(context: StageExecutionContext): Promise<StageExecutionResult> {
      const languageCode = context.languageCode ?? 'unknown';
      const startedAt = Date.now();
      const durationMs = await simulateWork(
        NODE_KINDS.SPEECH,
        context.profile,
        context.durationSeconds,
        context.signal,
        context.onProgress,
      );

      const relativePath = `${languageCode}.wav`;
      const absolutePath = await writePlaceholderArtifact(
        context.artifactRoot,
        relativePath,
        `PLACEHOLDER_SPEECH_${languageCode}`,
      );

      return {
        artifacts: { [`speech:${languageCode}`]: absolutePath },
        durationMs: Date.now() - startedAt || durationMs,
      };
    },
    validate(result: StageExecutionResult): Promise<void> {
      if (Object.keys(result.artifacts).length === 0) {
        return Promise.reject(new Error('Speech provider produced no artifacts.'));
      }
      return Promise.resolve();
    },
    cleanup(): Promise<void> {
      return Promise.resolve();
    },
  };
}

export function createFakeAlignProvider(): PipelineStageCapabilityHandler {
  return {
    initialize(): Promise<void> {
      return Promise.resolve();
    },
    async execute(context: StageExecutionContext): Promise<StageExecutionResult> {
      const languageCode = context.languageCode ?? 'unknown';
      const startedAt = Date.now();
      const durationMs = await simulateWork(
        NODE_KINDS.ALIGN,
        context.profile,
        context.durationSeconds,
        context.signal,
        context.onProgress,
      );

      const relativePath = `${languageCode}.aligned.wav`;
      const absolutePath = await writePlaceholderArtifact(
        context.artifactRoot,
        relativePath,
        `PLACEHOLDER_ALIGNED_SPEECH_${languageCode}`,
      );

      return {
        artifacts: { [`alignedSpeech:${languageCode}`]: absolutePath },
        durationMs: Date.now() - startedAt || durationMs,
      };
    },
    validate(result: StageExecutionResult): Promise<void> {
      if (Object.keys(result.artifacts).length === 0) {
        return Promise.reject(new Error('Alignment provider produced no artifacts.'));
      }
      return Promise.resolve();
    },
    cleanup(): Promise<void> {
      return Promise.resolve();
    },
  };
}

export function createFakeMuxProvider(): PipelineStageCapabilityHandler {
  return createBaseProvider(NODE_KINDS.MUX, 'output', 'movie.mkv', (context) =>
    createPlaceholderJson('mux', {
      container: context.output.containerFormat,
      outputDirectory: context.outputDirectory,
    }),
  );
}

export function createFakeVerifyProvider(): PipelineStageCapabilityHandler {
  return createBaseProvider(NODE_KINDS.VERIFY, 'verification', 'verification.json', () =>
    createPlaceholderJson('verification', { playable: true, tracksVerified: true }),
  );
}

export function createFakeManifestProvider(): PipelineStageCapabilityHandler {
  return createBaseProvider(NODE_KINDS.MANIFEST, 'manifest', 'manifest.json', (context) =>
    createPlaceholderJson('manifest', {
      jobId: context.jobId,
      workflowId: context.workflowId,
      profile: context.profile,
      languages: context.languageCode,
      artifacts: context.artifacts,
    }),
  );
}
