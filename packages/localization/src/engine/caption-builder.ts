import type { LocalizedDocument } from '../domain/localized-document.js';

function formatTimestamp(milliseconds: number): string {
  const totalMs = Math.max(0, milliseconds);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function buildSrtFromLocalizedDocument(document: LocalizedDocument): string {
  const lines: string[] = [];

  document.segments.forEach((segment, index) => {
    lines.push(String(index + 1));
    lines.push(`${formatTimestamp(segment.startMs)} --> ${formatTimestamp(segment.endMs)}`);
    lines.push(segment.text);
    lines.push('');
  });

  return lines.join('\n');
}

export function buildPlainFromLocalizedDocument(document: LocalizedDocument): string {
  return document.segments.map((segment) => segment.text).join('\n\n');
}
