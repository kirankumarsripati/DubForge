import { describe, expect, it } from 'vitest';
import { isVideoImportError } from './video-import-error';

describe('isVideoImportError', () => {
  it('identifies structured import errors', () => {
    expect(
      isVideoImportError({
        title: 'Unsupported file type',
        description: 'Only MP4 and MKV files are supported in this version.',
        recoveryAction: 'Convert the file to MP4 or MKV, then try again.',
      }),
    ).toBe(true);
  });

  it('rejects unrelated errors', () => {
    expect(isVideoImportError(new Error('boom'))).toBe(false);
  });
});
