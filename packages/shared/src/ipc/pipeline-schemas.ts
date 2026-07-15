import { z } from 'zod';

const translationProfileSchema = z.union([
  z.literal('fast'),
  z.literal('balanced'),
  z.literal('studio'),
]);

const outputOptionsSchema = z.object({
  generateTranslatedAudio: z.boolean(),
  generateSubtitles: z.boolean(),
  embedSubtitles: z.boolean(),
  exportSrt: z.boolean(),
  exportTranscript: z.boolean(),
  containerFormat: z.literal('mkv'),
});

const videoMetadataSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  durationSeconds: z.number().nonnegative(),
  resolution: z.string().min(1),
  codec: z.string().min(1),
  audioTracks: z.number().int().nonnegative(),
  fileSizeBytes: z.number().nonnegative(),
  frameRate: z.number().nonnegative(),
  bitrateKbps: z.number().nonnegative(),
  thumbnailUrl: z.string().nullable(),
});

const pipelineStageNameSchema = z.union([
  z.literal('validate'),
  z.literal('extract-audio'),
  z.literal('speech-recognition'),
  z.literal('translate'),
  z.literal('generate-speech'),
  z.literal('mux'),
  z.literal('verify'),
]);

const pipelineStageSchema = z.object({
  name: pipelineStageNameSchema,
  label: z.string(),
  status: z.union([
    z.literal('pending'),
    z.literal('running'),
    z.literal('completed'),
    z.literal('failed'),
    z.literal('skipped'),
  ]),
  progress: z.number().min(0).max(100),
});

export const startPipelineJobRequestSchema = z.object({
  video: videoMetadataSchema,
  languages: z.array(z.string().min(1)).min(1),
  voices: z.record(z.string(), z.string()),
  profile: translationProfileSchema,
  output: outputOptionsSchema,
  outputDirectory: z.string().min(1),
});

export const cancelPipelineJobRequestSchema = z.object({
  jobId: z.string().min(1),
});

export const workflowTimelineNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  label: z.string().min(1),
  status: z.union([
    z.literal('pending'),
    z.literal('queued'),
    z.literal('running'),
    z.literal('completed'),
    z.literal('failed'),
    z.literal('skipped'),
    z.literal('cancelled'),
  ]),
  progress: z.number().min(0).max(100),
  dependencies: z.array(z.string()),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  languageCode: z.string().nullable(),
  layer: z.number().int().nonnegative(),
});

export const pipelineJobResponseSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  status: z.union([
    z.literal('queued'),
    z.literal('validating'),
    z.literal('processing'),
    z.literal('completed'),
    z.literal('failed'),
    z.literal('cancelled'),
  ]),
  languages: z.array(z.string()),
  progress: z.number().min(0).max(100),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  outputPath: z.string().nullable(),
  stages: z.array(pipelineStageSchema),
  timeline: z.array(workflowTimelineNodeSchema),
  error: z
    .object({
      title: z.string(),
      description: z.string(),
      recoveryAction: z.string(),
    })
    .nullable(),
});

export const pipelineEventSchema = z.object({
  type: z.string().min(1),
  workflowId: z.string().min(1),
  jobId: z.string().min(1),
  timestamp: z.string().min(1),
  nodeId: z.string().optional(),
  progress: z.number().optional(),
});

export type StartPipelineJobRequest = z.infer<typeof startPipelineJobRequestSchema>;
export type CancelPipelineJobRequest = z.infer<typeof cancelPipelineJobRequestSchema>;
export type PipelineJobResponse = z.infer<typeof pipelineJobResponseSchema>;
export type PipelineEventPayload = z.infer<typeof pipelineEventSchema>;
