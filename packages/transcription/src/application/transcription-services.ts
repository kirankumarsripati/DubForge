import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import { PIPELINE_STAGE_CAPABILITY } from '@dubforge/providers';
import type { ExtensionRuntime } from '@dubforge/providers';
import { NODE_KINDS } from '@dubforge/types';

import { serializeCanonicalTranscript } from '../domain/canonical-transcript.js';
import { TRANSCRIPTION_OPERATION_KINDS } from '../domain/constants.js';
import type { RecognizeSpeechPort } from '../ports/transcription-ports.js';
import { buildCanonicalTranscriptFromSeconds } from '../processing/normalization.js';
import { buildPlainTranscript, buildSrtCaptions } from '../processing/caption-builder.js';
import type { TranscriptProcessingPlatform } from '../processing/transcript-processing-platform.js';
import type { LocalizationRepository } from '../repository/localization-repository.js';
import {
  publishTranscriptionOperationCompleted,
  publishTranscriptionOperationFailed,
  publishTranscriptionOperationStarted,
  publishTranscriptionQualityAnalyzed,
  publishTranscriptionRecognized,
} from './transcription-event-publisher.js';

function resolveAudioArtifactPath(artifacts: Readonly<Record<string, string>>): string | undefined {
  return (
    Object.values(artifacts).find((path) => path.endsWith('.wav')) ??
    artifacts['extract-audio'] ??
    Object.values(artifacts).find((path) => path.includes('audio'))
  );
}

export class RecognizeSpeechService {
  constructor(
    private readonly options: {
      readonly eventBus: DomainEventBus;
      readonly repository: LocalizationRepository;
      readonly recognizePort: RecognizeSpeechPort;
      readonly processingPlatform: TranscriptProcessingPlatform;
      readonly artifactSink?: ArtifactSink;
      readonly extensionRuntime?: ExtensionRuntime;
    },
  ) {}

  async recognizeForWorkflow(input: {
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly artifactRoot: string;
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationSeconds: number;
    readonly artifactSink?: ArtifactSink;
    readonly onProgress: (progress: number) => void;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const operation = this.options.repository.startOperation({
      kind: TRANSCRIPTION_OPERATION_KINDS.RECOGNIZE,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      languageCode: 'en',
    });

    publishTranscriptionOperationStarted({
      eventBus: this.options.eventBus,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      operation,
    });

    try {
      if (
        this.options.extensionRuntime?.hasCapability(
          PIPELINE_STAGE_CAPABILITY,
          NODE_KINDS.SPEECH_RECOGNITION,
        )
      ) {
        // Extension runtime may override provider wiring in future phases.
      }

      const audioPath = resolveAudioArtifactPath(input.artifacts);
      if (audioPath === undefined) {
        throw new Error('Speech recognition requires an extracted audio artifact.');
      }

      const providerResult = await this.options.recognizePort.recognize({
        audioPath,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        languageCode: 'en',
        durationSeconds: input.durationSeconds,
        onProgress: input.onProgress,
      });

      const canonical = buildCanonicalTranscriptFromSeconds({
        workflowId: input.workflowId,
        jobId: input.jobId,
        languageCode: 'en',
        durationMs: Math.round(providerResult.durationSeconds * 1000),
        segments: providerResult.segments,
      });

      const aggregate = this.options.processingPlatform.process(canonical);
      this.options.repository.saveCanonicalTranscript(
        aggregate.transcript,
        aggregate.quality.score,
      );

      const artifactPath = `${input.artifactRoot}/${input.nodeId}-canonical-transcript.json`;
      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(artifactPath, serializeCanonicalTranscript(aggregate.transcript));
      }

      const completed = this.options.repository.completeOperation(
        operation.id,
        artifactPath,
        providerResult.durationMs,
      );

      publishTranscriptionRecognized({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        transcript: aggregate.transcript,
        artifactPath,
      });

      publishTranscriptionQualityAnalyzed({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        score: aggregate.quality.score,
        languageCode: 'en',
      });

      publishTranscriptionOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath,
      });

      return {
        artifacts: {
          'speech-recognition': artifactPath,
          'canonical-transcript': artifactPath,
        },
        durationMs: providerResult.durationMs,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Speech recognition failed.';
      publishTranscriptionOperationFailed({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: failed,
        message,
      });
      throw error;
    }
  }
}

export class BuildTranscriptService {
  constructor(
    private readonly options: {
      readonly eventBus: DomainEventBus;
      readonly repository: LocalizationRepository;
      readonly processingPlatform: TranscriptProcessingPlatform;
      readonly artifactSink?: ArtifactSink;
    },
  ) {}

  async buildForWorkflow(input: {
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly artifactRoot: string;
    readonly artifactSink?: ArtifactSink;
    readonly onProgress: (progress: number) => void;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const operation = this.options.repository.startOperation({
      kind: TRANSCRIPTION_OPERATION_KINDS.BUILD_TRANSCRIPT,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      languageCode: 'en',
    });

    publishTranscriptionOperationStarted({
      eventBus: this.options.eventBus,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      operation,
    });

    try {
      const canonical = this.options.repository.getCanonicalTranscript(input.workflowId, 'en');
      if (canonical === null) {
        throw new Error(
          'English canonical transcript was not found in the localization repository.',
        );
      }

      const aggregate = this.options.processingPlatform.process(canonical);
      const plainPath = `${input.artifactRoot}/${input.nodeId}-english.txt`;
      const srtPath = `${input.artifactRoot}/${input.nodeId}-english.srt`;
      const manifestPath = `${input.artifactRoot}/${input.nodeId}-english-transcript.json`;

      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(plainPath, buildPlainTranscript(aggregate.transcript));
        await sink.writeText(srtPath, buildSrtCaptions(aggregate.transcript));
        await sink.writeText(
          manifestPath,
          JSON.stringify(
            {
              quality: aggregate.quality,
              normalizationVersion: aggregate.normalizationVersion,
              transcriptId: aggregate.transcript.id,
            },
            null,
            2,
          ),
        );
      }

      input.onProgress(100);

      const completed = this.options.repository.completeOperation(operation.id, manifestPath, 1);

      publishTranscriptionQualityAnalyzed({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        score: aggregate.quality.score,
        languageCode: 'en',
      });

      publishTranscriptionOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath: manifestPath,
      });

      return {
        artifacts: {
          englishTranscript: plainPath,
          'english-subtitle': srtPath,
          'english-transcript-manifest': manifestPath,
        },
        durationMs: 1,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Transcript build failed.';
      publishTranscriptionOperationFailed({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: failed,
        message,
      });
      throw error;
    }
  }
}
