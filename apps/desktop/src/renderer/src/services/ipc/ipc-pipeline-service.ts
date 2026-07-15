import type { Job, PipelineService, StartJobRequest } from '@dubforge/types';
import type { PipelineJobResponse } from '@dubforge/shared';

function toJob(response: PipelineJobResponse): Job {
  return response as Job;
}

export class IpcPipelineService implements PipelineService {
  async startJob(request: StartJobRequest): Promise<Job> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Pipeline bridge is unavailable.');
    }

    const response = await api.pipeline.startJob(request);
    return toJob(response);
  }

  async cancelJob(id: string): Promise<void> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Pipeline bridge is unavailable.');
    }

    await api.pipeline.cancelJob(id);
  }

  async getActiveJob(): Promise<Job | null> {
    const api = window.dubforge;
    if (api === undefined) {
      return null;
    }

    const response = await api.pipeline.getActiveJob();
    return response === null ? null : toJob(response);
  }

  subscribe(listener: (job: Job) => void): () => void {
    const api = window.dubforge;
    if (api === undefined) {
      return () => undefined;
    }

    return api.pipeline.subscribeEvents(() => {
      void api.pipeline.getActiveJob().then((response) => {
        if (response !== null) {
          listener(toJob(response));
        }
      });
    });
  }
}

export const ipcPipelineService = new IpcPipelineService();
