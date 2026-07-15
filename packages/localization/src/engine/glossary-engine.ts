import type { GlossaryEntry } from '../ports/localization-ports.js';

export function applyGlossaryToText(
  text: string,
  entries: readonly GlossaryEntry[],
): { readonly text: string; readonly applied: boolean } {
  let result = text;
  let applied = false;

  for (const entry of entries) {
    if (entry.sourceTerm.length === 0) {
      continue;
    }

    const replaced = entry.caseSensitive
      ? replaceAll(result, entry.sourceTerm, entry.targetTerm)
      : replaceAllCaseInsensitive(result, entry.sourceTerm, entry.targetTerm);

    if (replaced !== result) {
      result = replaced;
      applied = true;
    }
  }

  return { text: result, applied };
}

function replaceAll(value: string, search: string, replacement: string): string {
  if (search.length === 0) {
    return value;
  }

  return value.split(search).join(replacement);
}

function replaceAllCaseInsensitive(value: string, search: string, replacement: string): string {
  if (search.length === 0) {
    return value;
  }

  const pattern = new RegExp(escapeRegExp(search), 'gi');
  return value.replace(pattern, replacement);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
