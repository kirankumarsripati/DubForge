import { z } from 'zod';

export const inspectVideoFileRequestSchema = z.object({
  filePath: z.string().min(1),
});

export const openRecentVideoRequestSchema = z.object({
  id: z.string().min(1),
});

export const videoMetadataResponseSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  durationSeconds: z.number().nonnegative(),
  resolution: z.string().min(1),
  codec: z.string().min(1),
  audioTracks: z.number().int().nonnegative(),
  fileSizeBytes: z.number().int().nonnegative(),
  frameRate: z.number().nonnegative(),
  bitrateKbps: z.number().nonnegative(),
  thumbnailUrl: z.string().nullable(),
});

export const recentVideoFileResponseSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  importedAt: z.string().min(1),
  durationSeconds: z.number().nonnegative(),
  thumbnailUrl: z.string().nullable(),
});

export const videoImportErrorResponseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  recoveryAction: z.string().min(1),
});

export type InspectVideoFileRequest = z.infer<typeof inspectVideoFileRequestSchema>;
export type OpenRecentVideoRequest = z.infer<typeof openRecentVideoRequestSchema>;
export type VideoMetadataResponse = z.infer<typeof videoMetadataResponseSchema>;
export type RecentVideoFileResponse = z.infer<typeof recentVideoFileResponseSchema>;
export type VideoImportErrorResponse = z.infer<typeof videoImportErrorResponseSchema>;
export type VideoImportResult =
  | { readonly ok: true; readonly data: VideoMetadataResponse }
  | { readonly ok: false; readonly error: VideoImportErrorResponse };

export const videoImportResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    data: videoMetadataResponseSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: videoImportErrorResponseSchema,
  }),
]);
