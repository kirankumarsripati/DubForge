import { z } from 'zod';

export const modelCategorySchema = z.enum(['speech-to-text', 'translation', 'speech']);

export const modelHealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);

export const modelStatusSchema = z.enum([
  'not-installed',
  'installed',
  'downloading',
  'verifying',
  'corrupted',
  'update-available',
]);

export const modelResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: modelCategorySchema,
  status: modelStatusSchema,
  version: z.string().min(1),
  latestVersion: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string().nullable(),
  installLocation: z.string().nullable(),
  health: modelHealthStatusSchema.nullable(),
  downloadProgress: z.number().int().min(0).max(100).nullable(),
  requiredBy: z.array(z.string().min(1)),
});

export const modelIdRequestSchema = z.object({
  id: z.string().min(1),
});

export const modelsChangedEventSchema = z.object({
  type: z.literal('models-changed'),
});

export const verificationCheckStepSchema = z.object({
  code: z.enum(['exists', 'size', 'sha256', 'permissions', 'readable', 'healthy']),
  passed: z.boolean(),
  message: z.string(),
  durationMs: z.number().int().nonnegative(),
  details: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export const verificationReportSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  valid: z.boolean(),
  steps: z.array(verificationCheckStepSchema),
  checkedAt: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
});

export const downloadReportSchema = z.object({
  id: z.string().min(1),
  downloadId: z.string().min(1),
  assetId: z.string().min(1),
  url: z.string().min(1),
  provider: z.string().min(1),
  redirectChain: z.array(z.string()),
  httpStatus: z.number().int().nullable(),
  responseHeaders: z.record(z.string()),
  contentLength: z.number().int().nonnegative().nullable(),
  expectedSizeBytes: z.number().int().nonnegative().nullable(),
  downloadedSizeBytes: z.number().int().nonnegative(),
  sha256Expected: z.string().nullable(),
  sha256Actual: z.string().nullable(),
  mimeType: z.string().nullable(),
  durationMs: z.number().int().nonnegative(),
  retryCount: z.number().int().nonnegative(),
  success: z.boolean(),
  errorMessage: z.string().nullable(),
  responseBody: z.string().nullable(),
  filesystemError: z.string().nullable(),
  createdAt: z.string().min(1),
});

export const assetDiagnosticsResponseSchema = z.object({
  assetId: z.string().min(1),
  downloadReports: z.array(downloadReportSchema),
  verificationReports: z.array(verificationReportSchema),
  latestVerification: verificationReportSchema.nullable(),
});

export const verifyModelResponseSchema = z.object({
  model: modelResponseSchema,
  verificationReport: verificationReportSchema,
});

export type ModelResponse = z.infer<typeof modelResponseSchema>;
export type ModelIdRequest = z.infer<typeof modelIdRequestSchema>;
export type ModelsChangedEvent = z.infer<typeof modelsChangedEventSchema>;
export type VerificationCheckStepResponse = z.infer<typeof verificationCheckStepSchema>;
export type VerificationReportResponse = z.infer<typeof verificationReportSchema>;
export type DownloadReportResponse = z.infer<typeof downloadReportSchema>;
export type AssetDiagnosticsResponse = z.infer<typeof assetDiagnosticsResponseSchema>;
export type VerifyModelResponse = z.infer<typeof verifyModelResponseSchema>;
