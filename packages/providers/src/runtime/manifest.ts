import { z } from 'zod';
import { EXTENSION_MANIFEST_VERSION } from './constants';
import type {
  ExtensionManifest,
  ExtensionValidationIssue,
  ExtensionValidationResult,
} from './types';

const capabilityDeclarationSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  key: z.string().min(1),
});

export const extensionManifestSchema = z.object({
  manifestVersion: z.literal(EXTENSION_MANIFEST_VERSION),
  id: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9.-]*$/),
  name: z.string().min(1),
  version: z
    .string()
    .min(1)
    .regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1),
  runtimeVersion: z.string().min(1),
  kind: z.union([z.literal('builtin'), z.literal('external')]),
  capabilities: z.array(capabilityDeclarationSchema).min(1),
  entry: z.string().min(1).optional(),
});

function createIssue(code: string, field: string, message: string): ExtensionValidationIssue {
  return { code, field, message };
}

export function parseExtensionManifest(input: unknown): ExtensionManifest {
  return extensionManifestSchema.parse(input);
}

export function validateExtensionManifest(input: unknown): ExtensionValidationResult {
  const parsed = extensionManifestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) =>
        createIssue('invalid-manifest', issue.path.join('.'), issue.message),
      ),
    };
  }

  const issues: ExtensionValidationIssue[] = [];
  const capabilityIds = new Set<string>();

  for (const capability of parsed.data.capabilities) {
    if (capabilityIds.has(capability.id)) {
      issues.push(
        createIssue(
          'duplicate-capability',
          `capabilities.${capability.id}`,
          `Duplicate capability id "${capability.id}".`,
        ),
      );
    }
    capabilityIds.add(capability.id);
  }

  if (parsed.data.kind === 'external' && parsed.data.entry === undefined) {
    issues.push(
      createIssue('missing-entry', 'entry', 'External extensions must declare an entry module.'),
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateParsedManifest(manifest: ExtensionManifest): ExtensionValidationResult {
  return validateExtensionManifest(manifest);
}
