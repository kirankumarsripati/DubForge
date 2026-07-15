import type { AsyncState, Job } from '@dubforge/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { jobService, setMockJobsSimulateError } from '../services';

interface JobsStoreState {
  readonly jobs: AsyncState<readonly Job[]>;
  fetchJobs: () => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  retryJob: (id: string) => Promise<void>;
  setSimulateError: (value: boolean) => void;
}

const initialState: AsyncState<readonly Job[]> = {
  status: 'idle',
  data: null,
  error: null,
};

export const useJobsStore = create<JobsStoreState>()(
  devtools(
    (set, get) => ({
      jobs: initialState,
      fetchJobs: async () => {
        set({ jobs: { status: 'loading', data: get().jobs.data, error: null } });
        try {
          const data = await jobService.listJobs();
          set({ jobs: { status: 'success', data, error: null } });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load jobs';
          set({ jobs: { status: 'error', data: null, error: message } });
        }
      },
      deleteJob: async (id) => {
        await jobService.deleteJob(id);
        await get().fetchJobs();
      },
      retryJob: async (id) => {
        await jobService.retryJob(id);
        await get().fetchJobs();
      },
      setSimulateError: (value) => {
        setMockJobsSimulateError(value);
      },
    }),
    { name: 'jobs-store' },
  ),
);
