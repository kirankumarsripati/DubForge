import type { Job, JobService } from '@dubforge/types';
import { MOCK_JOBS } from './mock-data';
import { delay } from './mock-utils';

let jobsState: Job[] = [...MOCK_JOBS];
let simulateError = false;

export function setMockJobsSimulateError(value: boolean): void {
  simulateError = value;
}

export class MockJobService implements JobService {
  async listJobs(): Promise<readonly Job[]> {
    await delay();
    if (simulateError) {
      throw new Error('Unable to load jobs. The job store is temporarily unavailable.');
    }
    return [...jobsState];
  }

  async getJob(id: string): Promise<Job | null> {
    await delay(300);
    return jobsState.find((job) => job.id === id) ?? null;
  }

  async deleteJob(id: string): Promise<void> {
    await delay(400);
    jobsState = jobsState.filter((job) => job.id !== id);
  }

  async retryJob(id: string): Promise<Job> {
    await delay(500);
    const index = jobsState.findIndex((job) => job.id === id);
    if (index === -1) {
      throw new Error('Job not found');
    }
    const existing = jobsState[index];
    if (!existing) {
      throw new Error('Job not found');
    }
    const retried: Job = {
      ...existing,
      status: 'queued',
      progress: 0,
      error: null,
      finishedAt: null,
      outputPath: null,
    };
    jobsState = [...jobsState.slice(0, index), retried, ...jobsState.slice(index + 1)];
    return retried;
  }

  setJobs(jobs: Job[]): void {
    jobsState = jobs;
  }

  addJob(job: Job): void {
    jobsState = [job, ...jobsState];
  }

  updateJob(id: string, updates: Partial<Job>): Job | null {
    const index = jobsState.findIndex((job) => job.id === id);
    if (index === -1) {
      return null;
    }
    const existing = jobsState[index];
    if (!existing) {
      return null;
    }
    const updated: Job = { ...existing, ...updates };
    jobsState = [...jobsState.slice(0, index), updated, ...jobsState.slice(index + 1)];
    return updated;
  }
}

export const mockJobService = new MockJobService();
