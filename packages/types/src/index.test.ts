import { describe, expect, it } from 'vitest';
import type { Job, JobStatus } from './index';

describe('Job types', () => {
  it('accepts valid job status values', () => {
    const status: JobStatus = 'completed';
    const job: Job = {
      id: 'job-1',
      filename: 'demo.mp4',
      status,
      languages: ['hi', 'te'],
      progress: 100,
      startedAt: '2026-07-15T10:00:00Z',
      finishedAt: '2026-07-15T10:30:00Z',
      durationSeconds: 1800,
      outputPath: '/output/demo.mkv',
      stages: [],
      error: null,
    };
    expect(job.status).toBe('completed');
  });
});
