import { z } from 'zod';

import { DOWNLOAD_SOURCE_TYPES } from '../download/source-types.js';
import { ASSET_CATEGORIES, ASSET_KINDS } from '../types.js';

export const downloadSourceSchema = z.object({
  type: z.enum([
    DOWNLOAD_SOURCE_TYPES.GITHUB_RELEASE,
    DOWNLOAD_SOURCE_TYPES.HUGGINGFACE,
    DOWNLOAD_SOURCE_TYPES.LOCAL_FILE,
    DOWNLOAD_SOURCE_TYPES.MIRROR,
  ]),
  url: z.string().min(1),
  headers: z.record(z.string()).optional(),
});

export const assetManifestSchema = z.object({
  sources: z.array(downloadSourceSchema).min(1),
  checksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .nullable()
    .optional(),
  filename: z.string().min(1).default('asset.bin'),
});

export const discoveredAssetEntrySchema = z.object({
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
  sourceUrl: z.string().url().nullable().optional(),
  sources: z.array(downloadSourceSchema).min(1),
  checksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .nullable()
    .optional(),
  filename: z.string().min(1).optional(),
});

export const discoveredDependencySchema = z.object({
  assetId: z.string().min(1),
  dependsOnAssetId: z.string().min(1),
  optional: z.boolean(),
});

export const assetCatalogFileSchema = z.object({
  assets: z.array(discoveredAssetEntrySchema),
  dependencies: z.array(discoveredDependencySchema).default([]),
});

export type DiscoveredAssetEntry = z.infer<typeof discoveredAssetEntrySchema>;
export type DiscoveredCatalogFile = z.infer<typeof assetCatalogFileSchema>;
