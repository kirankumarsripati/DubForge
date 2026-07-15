import { beforeEach, describe, expect, it } from 'vitest';
import { MOCK_JOBS } from './mock-data';
import { MockJobService, setMockJobsSimulateError } from './mock-job-service';

describe('MockJobService', () => {
  const service = new MockJobService();

  beforeEach(() => {
    setMockJobsSimulateError(false);
    service.setJobs([...MOCK_JOBS]);
  });

  it('lists jobs', async () => {
    const jobs = await service.listJobs();
    expect(jobs.length).toBeGreaterThan(0);
  });

  it('throws when simulate error is enabled', async () => {
    setMockJobsSimulateError(true);
    await expect(service.listJobs()).rejects.toThrow();
  });

  it('deletes a job', async () => {
    const first = MOCK_JOBS[0];
    if (!first) {
      throw new Error('No mock jobs');
    }
    await service.deleteJob(first.id);
    const jobs = await service.listJobs();
    expect(jobs.find((j) => j.id === first.id)).toBeUndefined();
  });
});
