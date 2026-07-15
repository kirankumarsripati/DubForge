import { describe, expect, it } from 'vitest';

import { buildFfprobeArgs, formatFfprobeDiagnostics } from './ffprobe-diagnostics';
import { createFfprobeValidationFailure } from './validation';

describe('ffprobe execution helpers', () => {
  it('builds ffprobe arguments for a file path', () => {
    const args = buildFfprobeArgs('/tmp/sample.mp4');
    expect(args).toContain('/tmp/sample.mp4');
    expect(args).toContain('-show_streams');
  });

  it('formats diagnostics for display', () => {
    const formatted = formatFfprobeDiagnostics({
      executablePath: '/usr/bin/ffprobe',
      args: ['-version'],
      command: '/usr/bin/ffprobe -version',
      exitCode: 1,
      stderr: 'Invalid data',
    });

    expect(formatted).toContain('Executable: /usr/bin/ffprobe');
    expect(formatted).toContain('Exit code: 1');
    expect(formatted).toContain('stderr: Invalid data');
  });

  it('creates ffprobe validation failures with diagnostics attached', () => {
    const failure = createFfprobeValidationFailure({
      executablePath: '/usr/bin/ffprobe',
      args: [],
      command: '/usr/bin/ffprobe',
      exitCode: 1,
      stderr: 'failed',
    });

    expect(failure.title).toBe('Unable to read video');
    expect(failure.code).toBe('ffprobe-failed');
    expect(failure.ffprobeDiagnostics?.stderr).toBe('failed');
  });
});
