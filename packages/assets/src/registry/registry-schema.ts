import { z } from 'zod';

import { downloadSourceSchema } from '../discovery/catalog-schema.js';
import { ASSET_CATEGORIES, ASSET_KINDS } from '../types.js';

export const REGISTRY_INDEX_FILENAME = 'registry.json' as const;

export const registryDependencySchema = z.object({
  assetId: z.string().min(1),
  dependsOnAssetId: z.string().min(1),
  optional: z.boolean(),
});

export const registryIndexEntrySchema = z.object({
  id: z.string().min(1),
  manifestPath: z.string().min(1),
});

export const registryIndexSchema = z.object({
  version: z.number().int().positive(),
  assets: z.array(registryIndexEntrySchema).min(1),
  dependencies: z.array(registryDependencySchema).default([]),
});

export const registeredAssetManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum([ASSET_KINDS.MODEL, ASSET_KINDS.EXTENSION, ASSET_KINDS.RUNTIME]),
  category: z.enum([
    ASSET_CATEGORIES.SPEECH_TO_TEXT,
    ASSET_CATEGORIES.TRANSLATION,
    ASSET_CATEGORIES.SPEECH,
    ASSET_CATEGORIES.EXTENSION_BINARY,
  ]),
  version: z.string().min(1),
  latestVersion: z.string().min(1),
  estimatedSizeBytes: z.number().int().nonnegative(),
  requiredBy: z.array(z.string().min(1)),
  sources: z.array(downloadSourceSchema).min(1),
  checksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .nullable()
    .optional(),
  filename: z.string().min(1).default('asset.bin'),
});

export type RegistryIndex = z.infer<typeof registryIndexSchema>;
export type RegistryDependency = z.infer<typeof registryDependencySchema>;
export type RegisteredAssetManifest = z.infer<typeof registeredAssetManifestSchema>;
