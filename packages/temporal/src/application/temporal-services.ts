import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import { PIPELINE_STAGE_CAPABILITY } from '@dubforge/providers';
import type { ExtensionRuntime } from '@dubforge/providers';
import { NODE_KINDS } from '@dubforge/types';

import { TEMPORAL_OPERATION_KINDS } from '../domain/constants.js';
import { serializeAlignmentPlan } from '../domain/alignment-plan.js';
import { serializeAudioComposition } from '../domain/audio-composition.js';
import { createAlignmentEngine } from '../engine/alignment-engine.js';
import { createCompositionEngine } from '../engine/composition-engine.js';
import type {
  AudioAlignerPort,
  AudioComposerPort,
  LocalizedDocumentReader,
  VoicePerformanceReader,
} from '../ports/temporal-ports.js';
import type { TemporalRepository } from '../repository/temporal-repository.js';
import {
  publishAlignedSegmentArtifactRegistered,
  publishAlignmentPlanCreated,
  publishAudioCompositionCompleted,
  publishTemporalOperationCompleted,
  publishTemporalOperationFailed,
  publishTemporalOperationStarted,
} from './temporal-event-publisher.js';

export class AlignAndComposeService {
  constructor(
    private readonly options: {
      readonly eventBus: DomainEventBus;
      readonly repository: TemporalRepository;
      readonly localizedDocumentReader: LocalizedDocumentReader;
      readonly voicePerformanceReader: VoicePerformanceReader;
      readonly aligner: AudioAlignerPort;
      readonly composerPort: AudioComposerPort;
      readonly artifactSink?: ArtifactSink;
      readonly extensionRuntime?: ExtensionRuntime;
    },
  ) {}

  async alignAndComposeForWorkflow(input: {
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
      throw new Error('Temporal alignment requires a target language code.');
    }

    const operation = this.options.repository.startOperation({
      kind: TEMPORAL_OPERATION_KINDS.ALIGN_AND_COMPOSE,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      languageCode: targetLanguage,
    });

    publishTemporalOperationStarted({
      eventBus: this.options.eventBus,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      operation,
    });

    try {
      if (
        this.options.extensionRuntime?.hasCapability(PIPELINE_STAGE_CAPABILITY, NODE_KINDS.ALIGN)
      ) {
        // Extension runtime may override provider wiring in future phases.
      }

      const document = this.options.localizedDocumentReader.getLocalizedDocument(
        input.workflowId,
        targetLanguage,
      );
      if (document === null) {
        throw new Error('Temporal alignment requires a localized document.');
      }

      const performance = this.options.voicePerformanceReader.getVoicePerformance(
        input.workflowId,
        targetLanguage,
      );
      if (performance?.stitchedAudioPath == null) {
        throw new Error('Temporal alignment requires a synthesized voice performance.');
      }

      const alignmentEngine = createAlignmentEngine();
      const plan = alignmentEngine.buildPlan({
        workflowId: input.workflowId,
        jobId: input.jobId,
        languageCode: targetLanguage,
        voicePerformanceId: performance.id,
        document,
        performanceSegments: performance.segments,
        artifactRoot: input.artifactRoot,
        nodeId: input.nodeId,
      });

      const planPath = `${input.artifactRoot}/${input.nodeId}-${targetLanguage}-alignment-plan.json`;
      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(planPath, serializeAlignmentPlan(plan));
      }

      this.options.repository.saveAlignmentPlan(plan);

      publishAlignmentPlanCreated({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        plan,
        artifactPath: planPath,
      });

      input.onProgress(10);

      const compositionEngine = createCompositionEngine({
        aligner: this.options.aligner,
        composerPort: this.options.composerPort,
      });

      const result = await compositionEngine.compose({
        plan,
        stitchedSpeechPath: performance.stitchedAudioPath,
        artifactRoot: input.artifactRoot,
        nodeId: input.nodeId,
        onProgress: (progress) => {
          input.onProgress(10 + Math.round(progress * 0.9));
        },
      });

      this.options.repository.saveAudioComposition(result.composition);

      const compositionPath = `${input.artifactRoot}/${input.nodeId}-${targetLanguage}-composition.json`;
      if (sink !== undefined) {
        await sink.writeText(compositionPath, serializeAudioComposition(result.composition));
      }

      for (const segment of result.alignedSegments) {
        publishAlignedSegmentArtifactRegistered({
          eventBus: this.options.eventBus,
          workflowId: input.workflowId,
          jobId: input.jobId,
          nodeId: input.nodeId,
          segmentId: segment.segmentId,
          artifactPath: segment.outputPath,
          languageCode: targetLanguage,
        });
      }

      publishAudioCompositionCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        composition: result.composition,
        artifactPath: result.composition.composedAudioPath,
      });

      const completed = this.options.repository.completeOperation(
        operation.id,
        result.composition.composedAudioPath,
        1,
      );

      publishTemporalOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath: result.composition.composedAudioPath,
      });

      return {
        artifacts: {
          [`alignment-plan:${targetLanguage}`]: planPath,
          [`alignedSpeech:${targetLanguage}`]: result.composition.alignedSpeechPath,
          [`composedAudio:${targetLanguage}`]: result.composition.composedAudioPath,
          [`audio-composition:${targetLanguage}`]: compositionPath,
          [`audio-layer:speech:${targetLanguage}`]: result.layerArtifacts.speech,
          ...(result.layerArtifacts.background !== null
            ? { [`audio-layer:background:${targetLanguage}`]: result.layerArtifacts.background }
            : {}),
          [`audio-layer:composed:${targetLanguage}`]: result.layerArtifacts.composed,
          ...result.segmentArtifacts,
        },
        durationMs: 1,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Temporal alignment failed.';
      publishTemporalOperationFailed({
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
