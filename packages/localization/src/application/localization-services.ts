import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import { PIPELINE_STAGE_CAPABILITY } from '@dubforge/providers';
import type { ExtensionRuntime } from '@dubforge/providers';
import { NODE_KINDS } from '@dubforge/types';
import { buildSrtCaptions, serializeCanonicalTranscript } from '@dubforge/transcription';

import { localizedDocumentToCanonicalTranscript } from '../engine/canonical-bridge.js';
import { buildSrtFromLocalizedDocument } from '../engine/caption-builder.js';
import type { LocalizationEngine } from '../engine/localization-engine.js';
import { LOCALIZATION_OPERATION_KINDS } from '../domain/constants.js';
import { serializeLocalizedDocument } from '../domain/localized-document.js';
import type { CanonicalTranscriptReader } from '../ports/localization-ports.js';
import type { LocalizationRepository } from '../repository/localization-repository.js';
import {
  publishLocalizedDocument,
  publishLocalizationOperationCompleted,
  publishLocalizationOperationFailed,
  publishLocalizationOperationStarted,
  publishLocalizationQualityAnalyzed,
} from './localization-event-publisher.js';

export class TranslateDocumentService {
  constructor(
    private readonly options: {
      readonly eventBus: DomainEventBus;
      readonly repository: LocalizationRepository;
      readonly transcriptReader: CanonicalTranscriptReader;
      readonly localizationEngine: LocalizationEngine;
      readonly artifactSink?: ArtifactSink;
      readonly extensionRuntime?: ExtensionRuntime;
    },
  ) {}

  async translateForWorkflow(input: {
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
      throw new Error('Translate stage requires a target language code.');
    }

    const operation = this.options.repository.startOperation({
      kind: LOCALIZATION_OPERATION_KINDS.TRANSLATE,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      languageCode: targetLanguage,
    });

    publishLocalizationOperationStarted({
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
          NODE_KINDS.TRANSLATE,
        )
      ) {
        // Extension runtime may override provider wiring in future phases.
      }

      const sourceCanonical = this.options.transcriptReader.getCanonicalTranscript(
        input.workflowId,
        'en',
      );
      if (sourceCanonical === null) {
        throw new Error('Translation requires an English canonical transcript.');
      }

      const glossaryEntries = this.options.repository.listGlossaryEntries('en', targetLanguage);
      const aggregate = await this.options.localizationEngine.localize({
        source: sourceCanonical,
        targetLanguageCode: targetLanguage,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        glossaryEntries,
        onProgress: input.onProgress,
      });

      this.options.repository.saveLocalizedDocument(aggregate.document, aggregate.quality.score);

      const documentPath = `${input.artifactRoot}/${input.nodeId}-${targetLanguage}-localized.json`;
      const canonicalPath = `${input.artifactRoot}/${input.nodeId}-${targetLanguage}-canonical.json`;
      const sink = input.artifactSink ?? this.options.artifactSink;

      if (sink !== undefined) {
        await sink.writeText(documentPath, serializeLocalizedDocument(aggregate.document));
        await sink.writeText(
          canonicalPath,
          serializeCanonicalTranscript(localizedDocumentToCanonicalTranscript(aggregate.document)),
        );
      }

      const completed = this.options.repository.completeOperation(operation.id, documentPath, 1);

      publishLocalizedDocument({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        document: aggregate.document,
        artifactPath: documentPath,
      });

      publishLocalizationQualityAnalyzed({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        score: aggregate.quality.score,
        languageCode: targetLanguage,
      });

      publishLocalizationOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath: documentPath,
      });

      return {
        artifacts: {
          [`translation:${targetLanguage}`]: documentPath,
          [`canonical-transcript:${targetLanguage}`]: canonicalPath,
          [`localized-document:${targetLanguage}`]: documentPath,
        },
        durationMs: 1,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Translation failed.';
      publishLocalizationOperationFailed({
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

export class BuildSubtitleService {
  constructor(
    private readonly options: {
      readonly eventBus: DomainEventBus;
      readonly repository: LocalizationRepository;
      readonly transcriptReader: CanonicalTranscriptReader;
      readonly artifactSink?: ArtifactSink;
    },
  ) {}

  async buildEnglishSubtitle(input: {
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
    const canonical = this.options.transcriptReader.getCanonicalTranscript(input.workflowId, 'en');
    if (canonical === null) {
      throw new Error('English subtitle build requires a canonical transcript.');
    }

    return this.writeSubtitle({
      ...input,
      languageCode: 'en',
      operationKind: LOCALIZATION_OPERATION_KINDS.BUILD_ENGLISH_SUBTITLE,
      captions: buildSrtCaptions(canonical),
      artifactSuffix: 'english',
    });
  }

  async buildLocalizedSubtitle(input: {
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
      throw new Error('Subtitle stage requires a target language code.');
    }

    const document = this.options.repository.getLocalizedDocument(input.workflowId, targetLanguage);
    if (document === null) {
      throw new Error('Localized subtitle build requires a localized document.');
    }

    return this.writeSubtitle({
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      artifactRoot: input.artifactRoot,
      artifactSink: input.artifactSink,
      onProgress: input.onProgress,
      languageCode: targetLanguage,
      operationKind: LOCALIZATION_OPERATION_KINDS.BUILD_SUBTITLE,
      captions: buildSrtFromLocalizedDocument(document),
      artifactSuffix: targetLanguage,
    });
  }

  private async writeSubtitle(input: {
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly languageCode: string;
    readonly artifactRoot: string;
    readonly artifactSink?: ArtifactSink;
    readonly onProgress: (progress: number) => void;
    readonly operationKind:
      | typeof LOCALIZATION_OPERATION_KINDS.BUILD_SUBTITLE
      | typeof LOCALIZATION_OPERATION_KINDS.BUILD_ENGLISH_SUBTITLE;
    readonly captions: string;
    readonly artifactSuffix: string;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const operation = this.options.repository.startOperation({
      kind: input.operationKind,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      languageCode: input.languageCode,
    });

    publishLocalizationOperationStarted({
      eventBus: this.options.eventBus,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      operation,
    });

    try {
      const srtPath = `${input.artifactRoot}/${input.nodeId}-${input.artifactSuffix}.srt`;
      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(srtPath, input.captions);
      }

      input.onProgress(100);

      const completed = this.options.repository.completeOperation(operation.id, srtPath, 1);

      publishLocalizationOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath: srtPath,
      });

      return {
        artifacts: {
          [`subtitle:${input.languageCode}`]: srtPath,
        },
        durationMs: 1,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Subtitle build failed.';
      publishLocalizationOperationFailed({
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
