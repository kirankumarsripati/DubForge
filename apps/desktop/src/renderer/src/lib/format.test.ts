import { describe, expect, it } from 'vitest';
import { formatBytes, formatDuration, formatLanguageCodes } from './format';

describe('format', () => {
  it('formats bytes', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1_500_000_000)).toBe('1.40 GB');
  });

  it('formats duration', () => {
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3720)).toBe('1h 2m');
  });

  it('formats language codes', () => {
    expect(formatLanguageCodes(['hi', 'te'])).toBe('HI, TE');
  });
});
