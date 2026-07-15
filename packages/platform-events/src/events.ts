import type { NodeKind } from '@dubforge/types';

export const WORKFLOW_EVENTS = {
  STARTED: 'workflow.started',
  COMPLETED: 'workflow.completed',
  FAILED: 'workflow.failed',
  CANCELLED: 'workflow.cancelled',
  STATE_CHANGED: 'workflow.state-changed',
  NODE_QUEUED: 'workflow.node-queued',
  NODE_DISPATCHED: 'workflow.node-dispatched',
  NODE_STARTED: 'workflow.node-started',
  NODE_PROGRESS: 'workflow.node-progress',
  NODE_COMPLETED: 'workflow.node-completed',
  NODE_FAILED: 'workflow.node-failed',
  NODE_RETRYING: 'workflow.node-retrying',
} as const;

export const EXECUTION_EVENTS = {
  REQUESTED: 'execution.requested',
  STARTED: 'execution.started',
  PROGRESS: 'execution.progress',
  COMPLETED: 'execution.completed',
  FAILED: 'execution.failed',
  CANCELLED: 'execution.cancelled',
  TIMED_OUT: 'execution.timed-out',
} as const;

export const ARTIFACT_EVENTS = {
  REGISTERED: 'artifact.registered',
  RESOLVED: 'artifact.resolved',
  PERSISTED: 'artifact.persisted',
  DELETED: 'artifact.deleted',
} as const;

export const RESOURCE_EVENTS = {
  SNAPSHOT: 'resource.snapshot',
  THRESHOLD_EXCEEDED: 'resource.threshold-exceeded',
} as const;

export const OBSERVABILITY_EVENTS = {
  LOG_RECORDED: 'observability.log-recorded',
  METRIC_RECORDED: 'observability.metric-recorded',
  TIMELINE_ENTRY: 'observability.timeline-entry',
  SPAN_STARTED: 'observability.span-started',
  SPAN_ENDED: 'observability.span-ended',
} as const;

export const MEDIA_EVENTS = {
  FILE_PROBED: 'media.file-probed',
  FINGERPRINT_COMPUTED: 'media.fingerprint-computed',
  THUMBNAIL_GENERATED: 'media.thumbnail-generated',
  AUDIO_EXTRACTED: 'media.audio-extracted',
  IMPORT_COMPLETED: 'media.import-completed',
  OPERATION_STARTED: 'media.operation-started',
  OPERATION_COMPLETED: 'media.operation-completed',
  OPERATION_FAILED: 'media.operation-failed',
  ARTIFACT_PRODUCED: 'media.artifact-produced',
  DIAGNOSTIC_RECORDED: 'media.diagnostic-recorded',
} as const;

export const TRANSCRIPTION_EVENTS = {
  RECOGNIZED: 'transcription.recognized',
  OPERATION_STARTED: 'transcription.operation-started',
  OPERATION_COMPLETED: 'transcription.operation-completed',
  OPERATION_FAILED: 'transcription.operation-failed',
  ARTIFACT_PRODUCED: 'transcription.artifact-produced',
  QUALITY_ANALYZED: 'transcription.quality-analyzed',
} as const;

export const LOCALIZATION_EVENTS = {
  DOCUMENT_LOCALIZED: 'localization.document-localized',
  OPERATION_STARTED: 'localization.operation-started',
  OPERATION_COMPLETED: 'localization.operation-completed',
  OPERATION_FAILED: 'localization.operation-failed',
  ARTIFACT_PRODUCED: 'localization.artifact-produced',
  QUALITY_ANALYZED: 'localization.quality-analyzed',
  MEMORY_HIT: 'localization.memory-hit',
  GLOSSARY_APPLIED: 'localization.glossary-applied',
} as const;

export const VOICE_PERFORMANCE_EVENTS = {
  SYNTHESIZED: 'voice-performance.synthesized',
  ALIGNED: 'voice-performance.aligned',
  OPERATION_STARTED: 'voice-performance.operation-started',
  OPERATION_COMPLETED: 'voice-performance.operation-completed',
  OPERATION_FAILED: 'voice-performance.operation-failed',
  ARTIFACT_PRODUCED: 'voice-performance.artifact-produced',
  SEGMENT_ARTIFACT_REGISTERED: 'voice-performance.segment-artifact-registered',
} as const;

export const TEMPORAL_EVENTS = {
  ALIGNMENT_PLANNED: 'temporal.alignment-planned',
  COMPOSED: 'temporal.composed',
  OPERATION_STARTED: 'temporal.operation-started',
  OPERATION_COMPLETED: 'temporal.operation-completed',
  OPERATION_FAILED: 'temporal.operation-failed',
  ARTIFACT_PRODUCED: 'temporal.artifact-produced',
  SEGMENT_ARTIFACT_REGISTERED: 'temporal.segment-artifact-registered',
} as const;

export const DELIVERY_EVENTS = {
  PACKAGING_STARTED: 'delivery.packaging-started',
  PACKAGING_COMPLETED: 'delivery.packaging-completed',
  VALIDATION_COMPLETED: 'delivery.validation-completed',
  PROJECT_ARCHIVED: 'delivery.project-archived',
  EXPORT_FAILED: 'delivery.export-failed',
  OPERATION_STARTED: 'delivery.operation-started',
  OPERATION_COMPLETED: 'delivery.operation-completed',
  OPERATION_FAILED: 'delivery.operation-failed',
  ARTIFACT_PRODUCED: 'delivery.artifact-produced',
  METRIC_RECORDED: 'delivery.metric-recorded',
} as const;

export interface DomainEventBase {
  readonly id: string;
  readonly timestamp: string;
  readonly workflowId: string;
  readonly jobId: string;
}

export interface WorkflowLifecycleEvent extends DomainEventBase {
  readonly type:
    | typeof WORKFLOW_EVENTS.STARTED
    | typeof WORKFLOW_EVENTS.COMPLETED
    | typeof WORKFLOW_EVENTS.FAILED
    | typeof WORKFLOW_EVENTS.CANCELLED;
}

export interface WorkflowStateChangedEvent extends DomainEventBase {
  readonly type: typeof WORKFLOW_EVENTS.STATE_CHANGED;
  readonly status: string;
}

export interface WorkflowNodeEvent extends DomainEventBase {
  readonly type:
    | typeof WORKFLOW_EVENTS.NODE_QUEUED
    | typeof WORKFLOW_EVENTS.NODE_DISPATCHED
    | typeof WORKFLOW_EVENTS.NODE_STARTED
    | typeof WORKFLOW_EVENTS.NODE_COMPLETED
    | typeof WORKFLOW_EVENTS.NODE_FAILED
    | typeof WORKFLOW_EVENTS.NODE_RETRYING;
  readonly nodeId: string;
}

export interface WorkflowNodeProgressEvent extends DomainEventBase {
  readonly type: typeof WORKFLOW_EVENTS.NODE_PROGRESS;
  readonly nodeId: string;
  readonly progress: number;
}

export interface ExecutionLifecycleEvent extends DomainEventBase {
  readonly type:
    | typeof EXECUTION_EVENTS.REQUESTED
    | typeof EXECUTION_EVENTS.STARTED
    | typeof EXECUTION_EVENTS.COMPLETED
    | typeof EXECUTION_EVENTS.FAILED
    | typeof EXECUTION_EVENTS.CANCELLED
    | typeof EXECUTION_EVENTS.TIMED_OUT;
  readonly nodeId: string;
  readonly adapterKind: string;
  readonly artifacts?: Readonly<Record<string, string>>;
}

export interface ExecutionProgressEvent extends DomainEventBase {
  readonly type: typeof EXECUTION_EVENTS.PROGRESS;
  readonly nodeId: string;
  readonly progress: number;
}

export interface ArtifactLifecycleEvent extends DomainEventBase {
  readonly type:
    | typeof ARTIFACT_EVENTS.REGISTERED
    | typeof ARTIFACT_EVENTS.RESOLVED
    | typeof ARTIFACT_EVENTS.PERSISTED
    | typeof ARTIFACT_EVENTS.DELETED;
  readonly artifactId: string;
  readonly nodeId: string | null;
  readonly path: string;
}

export interface ResourceSnapshotEvent extends DomainEventBase {
  readonly type: typeof RESOURCE_EVENTS.SNAPSHOT;
  readonly cpuPercent: number;
  readonly memoryUsedMb: number;
  readonly memoryTotalMb: number;
  readonly gpuPercent: number | null;
  readonly diskUsedGb: number;
  readonly diskTotalGb: number;
}

export interface ResourceThresholdEvent extends DomainEventBase {
  readonly type: typeof RESOURCE_EVENTS.THRESHOLD_EXCEEDED;
  readonly resource: string;
  readonly value: number;
  readonly threshold: number;
}

export interface ObservabilityLogEvent extends DomainEventBase {
  readonly type: typeof OBSERVABILITY_EVENTS.LOG_RECORDED;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly message: string;
  readonly context: Readonly<Record<string, string>>;
}

export interface ObservabilityMetricEvent extends DomainEventBase {
  readonly type: typeof OBSERVABILITY_EVENTS.METRIC_RECORDED;
  readonly name: string;
  readonly value: number;
  readonly unit: string;
}

export interface ObservabilityTimelineEvent extends DomainEventBase {
  readonly type: typeof OBSERVABILITY_EVENTS.TIMELINE_ENTRY;
  readonly nodeId: string | null;
  readonly nodeKind: NodeKind | null;
  readonly label: string;
  readonly status: string;
}

export interface ObservabilitySpanEvent extends DomainEventBase {
  readonly type: typeof OBSERVABILITY_EVENTS.SPAN_STARTED | typeof OBSERVABILITY_EVENTS.SPAN_ENDED;
  readonly spanId: string;
  readonly spanName: string;
  readonly parentSpanId: string | null;
}

export interface MediaFileProbedEvent extends DomainEventBase {
  readonly type: typeof MEDIA_EVENTS.FILE_PROBED;
  readonly nodeId: string;
  readonly mediaFileId: string;
  readonly artifactPath: string;
  readonly container: string;
  readonly durationSeconds: number;
  readonly resolution: string;
  readonly videoCodec: string;
}

export interface MediaFingerprintComputedEvent extends DomainEventBase {
  readonly type: typeof MEDIA_EVENTS.FINGERPRINT_COMPUTED;
  readonly nodeId: string;
  readonly contentHash: string;
  readonly artifactPath: string;
}

export interface MediaThumbnailGeneratedEvent extends DomainEventBase {
  readonly type: typeof MEDIA_EVENTS.THUMBNAIL_GENERATED;
  readonly nodeId: string;
  readonly artifactPath: string;
  readonly thumbnailPath: string;
}

export interface MediaAudioExtractedEvent extends DomainEventBase {
  readonly type: typeof MEDIA_EVENTS.AUDIO_EXTRACTED;
  readonly nodeId: string;
  readonly artifactPath: string;
  readonly audioPath: string;
}

export interface MediaImportCompletedEvent extends DomainEventBase {
  readonly type: typeof MEDIA_EVENTS.IMPORT_COMPLETED;
  readonly mediaFileId: string;
  readonly contentHash: string;
  readonly artifactPaths: Readonly<Record<string, string>>;
}

export interface MediaOperationEvent extends DomainEventBase {
  readonly type:
    | typeof MEDIA_EVENTS.OPERATION_STARTED
    | typeof MEDIA_EVENTS.OPERATION_COMPLETED
    | typeof MEDIA_EVENTS.OPERATION_FAILED;
  readonly nodeId: string;
  readonly operationId: string;
  readonly operationKind: string;
  readonly artifactPath?: string;
  readonly durationMs?: number;
  readonly message?: string;
}

export interface MediaArtifactProducedEvent extends DomainEventBase {
  readonly type: typeof MEDIA_EVENTS.ARTIFACT_PRODUCED;
  readonly nodeId: string;
  readonly artifactPath: string;
  readonly operationKind: string;
}

export interface MediaDiagnosticEvent extends DomainEventBase {
  readonly type: typeof MEDIA_EVENTS.DIAGNOSTIC_RECORDED;
  readonly nodeId: string;
  readonly level: 'info' | 'warn' | 'error';
  readonly message: string;
}

export interface TranscriptionRecognizedEvent extends DomainEventBase {
  readonly type: typeof TRANSCRIPTION_EVENTS.RECOGNIZED;
  readonly nodeId: string;
  readonly transcriptId: string;
  readonly languageCode: string;
  readonly artifactPath: string;
  readonly segmentCount: number;
}

export interface TranscriptionOperationEvent extends DomainEventBase {
  readonly type:
    | typeof TRANSCRIPTION_EVENTS.OPERATION_STARTED
    | typeof TRANSCRIPTION_EVENTS.OPERATION_COMPLETED
    | typeof TRANSCRIPTION_EVENTS.OPERATION_FAILED;
  readonly nodeId: string;
  readonly operationId: string;
  readonly operationKind: string;
  readonly artifactPath?: string;
  readonly durationMs?: number;
  readonly message?: string;
  readonly languageCode: string | null;
}

export interface TranscriptionArtifactProducedEvent extends DomainEventBase {
  readonly type: typeof TRANSCRIPTION_EVENTS.ARTIFACT_PRODUCED;
  readonly nodeId: string;
  readonly artifactPath: string;
  readonly operationKind: string;
  readonly languageCode: string | null;
}

export interface TranscriptionQualityEvent extends DomainEventBase {
  readonly type: typeof TRANSCRIPTION_EVENTS.QUALITY_ANALYZED;
  readonly nodeId: string;
  readonly score: number;
  readonly languageCode: string;
}

export interface LocalizationDocumentEvent extends DomainEventBase {
  readonly type: typeof LOCALIZATION_EVENTS.DOCUMENT_LOCALIZED;
  readonly nodeId: string;
  readonly documentId: string;
  readonly targetLanguageCode: string;
  readonly segmentCount: number;
  readonly artifactPath: string;
}

export interface LocalizationOperationEvent extends DomainEventBase {
  readonly type:
    | typeof LOCALIZATION_EVENTS.OPERATION_STARTED
    | typeof LOCALIZATION_EVENTS.OPERATION_COMPLETED
    | typeof LOCALIZATION_EVENTS.OPERATION_FAILED;
  readonly nodeId: string;
  readonly operationId: string;
  readonly operationKind: string;
  readonly artifactPath?: string;
  readonly durationMs?: number;
  readonly message?: string;
  readonly languageCode: string | null;
}

export interface LocalizationArtifactProducedEvent extends DomainEventBase {
  readonly type: typeof LOCALIZATION_EVENTS.ARTIFACT_PRODUCED;
  readonly nodeId: string;
  readonly artifactPath: string;
  readonly operationKind: string;
  readonly languageCode: string | null;
}

export interface LocalizationQualityEvent extends DomainEventBase {
  readonly type: typeof LOCALIZATION_EVENTS.QUALITY_ANALYZED;
  readonly nodeId: string;
  readonly score: number;
  readonly languageCode: string;
}

export interface VoicePerformanceSynthesizedEvent extends DomainEventBase {
  readonly type: typeof VOICE_PERFORMANCE_EVENTS.SYNTHESIZED;
  readonly nodeId: string;
  readonly performanceId: string;
  readonly languageCode: string;
  readonly segmentCount: number;
  readonly artifactPath: string;
}

export interface VoicePerformanceAlignedEvent extends DomainEventBase {
  readonly type: typeof VOICE_PERFORMANCE_EVENTS.ALIGNED;
  readonly nodeId: string;
  readonly performanceId: string;
  readonly languageCode: string;
  readonly artifactPath: string;
}

export interface VoicePerformanceOperationEvent extends DomainEventBase {
  readonly type:
    | typeof VOICE_PERFORMANCE_EVENTS.OPERATION_STARTED
    | typeof VOICE_PERFORMANCE_EVENTS.OPERATION_COMPLETED
    | typeof VOICE_PERFORMANCE_EVENTS.OPERATION_FAILED;
  readonly nodeId: string;
  readonly operationId: string;
  readonly operationKind: string;
  readonly artifactPath?: string;
  readonly durationMs?: number;
  readonly message?: string;
  readonly languageCode: string | null;
}

export interface VoicePerformanceArtifactProducedEvent extends DomainEventBase {
  readonly type: typeof VOICE_PERFORMANCE_EVENTS.ARTIFACT_PRODUCED;
  readonly nodeId: string;
  readonly artifactPath: string;
  readonly operationKind: string;
  readonly languageCode: string | null;
}

export interface VoicePerformanceSegmentArtifactEvent extends DomainEventBase {
  readonly type: typeof VOICE_PERFORMANCE_EVENTS.SEGMENT_ARTIFACT_REGISTERED;
  readonly nodeId: string;
  readonly segmentId: string;
  readonly artifactPath: string;
  readonly languageCode: string;
}

export interface TemporalAlignmentPlannedEvent extends DomainEventBase {
  readonly type: typeof TEMPORAL_EVENTS.ALIGNMENT_PLANNED;
  readonly nodeId: string;
  readonly planId: string;
  readonly languageCode: string;
  readonly segmentCount: number;
  readonly artifactPath: string;
}

export interface TemporalComposedEvent extends DomainEventBase {
  readonly type: typeof TEMPORAL_EVENTS.COMPOSED;
  readonly nodeId: string;
  readonly compositionId: string;
  readonly languageCode: string;
  readonly artifactPath: string;
}

export interface TemporalOperationEvent extends DomainEventBase {
  readonly type:
    | typeof TEMPORAL_EVENTS.OPERATION_STARTED
    | typeof TEMPORAL_EVENTS.OPERATION_COMPLETED
    | typeof TEMPORAL_EVENTS.OPERATION_FAILED;
  readonly nodeId: string;
  readonly operationId: string;
  readonly operationKind: string;
  readonly artifactPath?: string;
  readonly durationMs?: number;
  readonly message?: string;
  readonly languageCode: string | null;
}

export interface TemporalArtifactProducedEvent extends DomainEventBase {
  readonly type: typeof TEMPORAL_EVENTS.ARTIFACT_PRODUCED;
  readonly nodeId: string;
  readonly artifactPath: string;
  readonly operationKind: string;
  readonly languageCode: string | null;
}

export interface TemporalSegmentArtifactEvent extends DomainEventBase {
  readonly type: typeof TEMPORAL_EVENTS.SEGMENT_ARTIFACT_REGISTERED;
  readonly nodeId: string;
  readonly segmentId: string;
  readonly artifactPath: string;
  readonly languageCode: string;
}

export interface DeliveryPackagingStartedEvent extends DomainEventBase {
  readonly type: typeof DELIVERY_EVENTS.PACKAGING_STARTED;
  readonly nodeId: string;
  readonly planId: string;
  readonly deliverableCount: number;
  readonly exportProfileId: string;
}

export interface DeliveryPackagingCompletedEvent extends DomainEventBase {
  readonly type: typeof DELIVERY_EVENTS.PACKAGING_COMPLETED;
  readonly nodeId: string;
  readonly deliveryId: string;
  readonly deliverableCount: number;
  readonly artifactPath: string;
}

export interface DeliveryValidationCompletedEvent extends DomainEventBase {
  readonly type: typeof DELIVERY_EVENTS.VALIDATION_COMPLETED;
  readonly nodeId: string;
  readonly deliverableId: string;
  readonly score: number;
  readonly playable: boolean;
}

export interface DeliveryProjectArchivedEvent extends DomainEventBase {
  readonly type: typeof DELIVERY_EVENTS.PROJECT_ARCHIVED;
  readonly nodeId: string;
  readonly bundlePath: string;
}

export interface DeliveryExportFailedEvent extends DomainEventBase {
  readonly type: typeof DELIVERY_EVENTS.EXPORT_FAILED;
  readonly nodeId: string;
  readonly message: string;
}

export interface DeliveryOperationEvent extends DomainEventBase {
  readonly type:
    | typeof DELIVERY_EVENTS.OPERATION_STARTED
    | typeof DELIVERY_EVENTS.OPERATION_COMPLETED
    | typeof DELIVERY_EVENTS.OPERATION_FAILED;
  readonly nodeId: string;
  readonly operationId: string;
  readonly operationKind: string;
  readonly artifactPath?: string;
  readonly durationMs?: number;
  readonly message?: string;
}

export interface DeliveryArtifactProducedEvent extends DomainEventBase {
  readonly type: typeof DELIVERY_EVENTS.ARTIFACT_PRODUCED;
  readonly nodeId: string;
  readonly artifactPath: string;
  readonly operationKind: string;
}

export interface DeliveryMetricRecordedEvent extends DomainEventBase {
  readonly type: typeof DELIVERY_EVENTS.METRIC_RECORDED;
  readonly nodeId: string;
  readonly exportTimeMs: number;
  readonly exportSizeBytes: number;
  readonly validationScore: number;
  readonly warningCount: number;
}

export type DomainEvent =
  | WorkflowLifecycleEvent
  | WorkflowStateChangedEvent
  | WorkflowNodeEvent
  | WorkflowNodeProgressEvent
  | ExecutionLifecycleEvent
  | ExecutionProgressEvent
  | ArtifactLifecycleEvent
  | ResourceSnapshotEvent
  | ResourceThresholdEvent
  | ObservabilityLogEvent
  | ObservabilityMetricEvent
  | ObservabilityTimelineEvent
  | ObservabilitySpanEvent
  | MediaFileProbedEvent
  | MediaFingerprintComputedEvent
  | MediaThumbnailGeneratedEvent
  | MediaAudioExtractedEvent
  | MediaImportCompletedEvent
  | MediaOperationEvent
  | MediaArtifactProducedEvent
  | MediaDiagnosticEvent
  | TranscriptionRecognizedEvent
  | TranscriptionOperationEvent
  | TranscriptionArtifactProducedEvent
  | TranscriptionQualityEvent
  | LocalizationDocumentEvent
  | LocalizationOperationEvent
  | LocalizationArtifactProducedEvent
  | LocalizationQualityEvent
  | VoicePerformanceSynthesizedEvent
  | VoicePerformanceAlignedEvent
  | VoicePerformanceOperationEvent
  | VoicePerformanceArtifactProducedEvent
  | VoicePerformanceSegmentArtifactEvent
  | TemporalAlignmentPlannedEvent
  | TemporalComposedEvent
  | TemporalOperationEvent
  | TemporalArtifactProducedEvent
  | TemporalSegmentArtifactEvent
  | DeliveryPackagingStartedEvent
  | DeliveryPackagingCompletedEvent
  | DeliveryValidationCompletedEvent
  | DeliveryProjectArchivedEvent
  | DeliveryExportFailedEvent
  | DeliveryOperationEvent
  | DeliveryArtifactProducedEvent
  | DeliveryMetricRecordedEvent;

export type DomainEventType = DomainEvent['type'];

export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void;
