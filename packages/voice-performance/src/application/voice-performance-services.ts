import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import { MOCK_VOICES } from '@dubforge/job-config';
import { PIPELINE_STAGE_CAPABILITY } from '@dubforge/providers';
import type { ExtensionRuntime } from '@dubforge/providers';
import { NODE_KINDS } from '@dubforge/types';

import { VOICE_PERFORMANCE_OPERATION_KINDS } from '../domain/constants.js';
import { serializeVoicePerformance } from '../domain/voice-performance.js';
import { createAudioPostProcessor } from '../engine/audio-post-processor.js';
import { createAudioStitcher } from '../engine/audio-stitcher.js';
import { createPronunciationResolver } from '../engine/pronunciation-resolver.js';
import type { SpeechSynthesisEngine } from '../engine/speech-synthesis-engine.js';
import type { LocalizedDocumentReader } from '../ports/voice-performance-ports.js';
import type { VoicePerformanceRepository } from '../repository/voice-performance-repository.js';
import {
  publishSegmentArtifactRegistered,
  publishVoicePerformanceAligned,
  publishVoicePerformanceOperationCompleted,
  publishVoicePerformanceOperationFailed,
  publishVoicePerformanceOperationStarted,
  publishVoicePerformanceSynthesized,
} from './voice-performance-event-publisher.js';

function resolveVoice(languageCode: string): { readonly id: string; readonly label: string } {
  const voice = MOCK_VOICES.find((entry) => entry.languageCode === languageCode);
  if (voice === undefined) {
    return { id: `${languageCode}-default`, label: `${languageCode} Default` };
  }

  return { id: voice.id, label: voice.label };
}

export class SynthesizeSpeechService {
  constructor(
    private readonly options: {
      readonly eventBus: DomainEventBus;
      readonly repository: VoicePerformanceRepository;
      readonly localizedDocumentReader: LocalizedDocumentReader;
      readonly synthesisEngine: SpeechSynthesisEngine;
      readonly artifactSink?: ArtifactSink;
      readonly extensionRuntime?: ExtensionRuntime;
    },
  ) {}

  async synthesizeForWorkflow(input: {
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly languageCode: string | null;
    readonly artifactRoot: string;
    readonly artifactSink?: ArtifactSink;
    readonly onProgress: (progress: number) => void;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const targetLanguage = input.languageCode;
    if (targetLanguage === null || targetLanguage.length === 0) {
      throw new Error('Speech synthesis requires a target language code.');
    }

    const operation = this.options.repository.startOperation({
      kind: VOICE_PERFORMANCE_OPERATION_KINDS.SYNTHESIZE,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      languageCode: targetLanguage,
    });

    publishVoicePerformanceOperationStarted({
      eventBus: this.options.eventBus,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      operation,
    });

    try {
      if (
        this.options.extensionRuntime?.hasCapability(PIPELINE_STAGE_CAPABILITY, NODE_KINDS.SPEECH)
      ) {
        // Extension runtime may override provider wiring in future phases.
      }

      const document = this.options.localizedDocumentReader.getLocalizedDocument(
        input.workflowId,
        targetLanguage,
      );
      if (document === null) {
        throw new Error('Speech synthesis requires a localized document.');
      }

      const voice = resolveVoice(targetLanguage);
      const pronunciationResolver = createPronunciationResolver(
        this.options.repository.listPronunciationEntries(targetLanguage),
      );

      const stitchedOutputPath = `${input.artifactRoot}/${input.nodeId}-${targetLanguage}.wav`;
      const manifestPath = `${input.artifactRoot}/${input.nodeId}-${targetLanguage}-performance.json`;

      const result = await this.options.synthesisEngine.synthesize({
        document,
        voiceId: voice.id,
        voiceLabel: voice.label,
        artifactRoot: input.artifactRoot,
        nodeId: input.nodeId,
        pronunciationResolver,
        stitchedOutputPath,
        onProgress: input.onProgress,
      });

      this.options.repository.saveVoicePerformance(result.performance);

      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(manifestPath, serializeVoicePerformance(result.performance));
      }

      for (const segment of result.performance.segments) {
        publishSegmentArtifactRegistered({
          eventBus: this.options.eventBus,
          workflowId: input.workflowId,
          jobId: input.jobId,
          nodeId: input.nodeId,
          segmentId: segment.id,
          artifactPath: segment.audioPath,
          languageCode: targetLanguage,
        });
      }

      const completed = this.options.repository.completeOperation(
        operation.id,
        stitchedOutputPath,
        1,
      );

      publishVoicePerformanceSynthesized({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        performance: result.performance,
        artifactPath: stitchedOutputPath,
      });

      publishVoicePerformanceOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath: stitchedOutputPath,
      });

      return {
        artifacts: {
          [`speech:${targetLanguage}`]: stitchedOutputPath,
          [`voice-performance:${targetLanguage}`]: manifestPath,
          ...result.segmentArtifacts,
        },
        durationMs: 1,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Speech synthesis failed.';
      publishVoicePerformanceOperationFailed({
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

export class AlignSpeechService {
  constructor(
    private readonly options: {
      readonly eventBus: DomainEventBus;
      readonly repository: VoicePerformanceRepository;
      readonly artifactSink?: ArtifactSink;
    },
  ) {}

  async alignForWorkflow(input: {
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly languageCode: string | null;
    readonly artifactRoot: string;
    readonly artifactSink?: ArtifactSink;
    readonly onProgress: (progress: number) => void;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const targetLanguage = input.languageCode;
    if (targetLanguage === null || targetLanguage.length === 0) {
      throw new Error('Speech alignment requires a target language code.');
    }

    const operation = this.options.repository.startOperation({
      kind: VOICE_PERFORMANCE_OPERATION_KINDS.ALIGN,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      languageCode: targetLanguage,
    });

    publishVoicePerformanceOperationStarted({
      eventBus: this.options.eventBus,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      operation,
    });

    try {
      const performance = this.options.repository.getVoicePerformance(
        input.workflowId,
        targetLanguage,
      );
      if (performance?.stitchedAudioPath == null) {
        throw new Error('Speech alignment requires a synthesized voice performance.');
      }

      const postProcessor = createAudioPostProcessor();
      const alignedSegments = postProcessor.alignSegments(
        performance.segments,
        performance.durationMs,
      );

      const alignedAudioPath = `${input.artifactRoot}/${input.nodeId}-${targetLanguage}.aligned.wav`;
      const stitcher = createAudioStitcher();
      await stitcher.stitch({
        segments: alignedSegments,
        totalDurationMs: performance.durationMs,
        outputPath: alignedAudioPath,
      });

      const alignedPerformance = {
        ...performance,
        segments: alignedSegments,
        alignedAudioPath,
      };

      this.options.repository.saveVoicePerformance(alignedPerformance);

      const manifestPath = `${input.artifactRoot}/${input.nodeId}-${targetLanguage}-aligned.json`;
      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(manifestPath, serializeVoicePerformance(alignedPerformance));
      }

      input.onProgress(100);

      const completed = this.options.repository.completeOperation(
        operation.id,
        alignedAudioPath,
        1,
      );

      publishVoicePerformanceAligned({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        performance: alignedPerformance,
        artifactPath: alignedAudioPath,
      });

      publishVoicePerformanceOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath: alignedAudioPath,
      });

      return {
        artifacts: {
          [`alignedSpeech:${targetLanguage}`]: alignedAudioPath,
          [`voice-performance-aligned:${targetLanguage}`]: manifestPath,
        },
        durationMs: 1,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Speech alignment failed.';
      publishVoicePerformanceOperationFailed({
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
