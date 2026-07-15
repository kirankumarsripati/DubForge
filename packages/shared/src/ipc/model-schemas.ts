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

export type ModelResponse = z.infer<typeof modelResponseSchema>;
export type ModelIdRequest = z.infer<typeof modelIdRequestSchema>;
export type ModelsChangedEvent = z.infer<typeof modelsChangedEventSchema>;
