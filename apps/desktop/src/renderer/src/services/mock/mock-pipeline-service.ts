import type { Job, PipelineService, StartJobRequest } from '@dubforge/types';
import { mockJobService } from './mock-job-service';
import { delay, randomId } from './mock-utils';

let activeJobId: string | null = 'job-002';

const initialStages = [
  { name: 'validate' as const, label: 'Validate', status: 'pending' as const, progress: 0 },
  {
    name: 'extract-audio' as const,
    label: 'Extract Audio',
    status: 'pending' as const,
    progress: 0,
  },
  {
    name: 'speech-recognition' as const,
    label: 'Speech Recognition',
    status: 'pending' as const,
    progress: 0,
  },
  { name: 'translate' as const, label: 'Translate', status: 'pending' as const, progress: 0 },
  {
    name: 'generate-speech' as const,
    label: 'Generate Speech',
    status: 'pending' as const,
    progress: 0,
  },
  { name: 'mux' as const, label: 'Mux', status: 'pending' as const, progress: 0 },
  { name: 'verify' as const, label: 'Verify', status: 'pending' as const, progress: 0 },
];

export class MockPipelineService implements PipelineService {
  async startJob(request: StartJobRequest): Promise<Job> {
    await delay(700);
    const job: Job = {
      id: randomId(),
      filename: request.video.filename,
      status: 'queued',
      languages: [...request.languages],
      progress: 0,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      durationSeconds: null,
      outputPath: request.outputDirectory,
      stages: initialStages,
      error: null,
    };
    mockJobService.addJob(job);
    activeJobId = job.id;

    void this.simulateProgress(job.id);
    return job;
  }

  async cancelJob(id: string): Promise<void> {
    await delay(300);
    mockJobService.updateJob(id, { status: 'cancelled', finishedAt: new Date().toISOString() });
    if (activeJobId === id) {
      activeJobId = null;
    }
  }

  async getActiveJob(): Promise<Job | null> {
    await delay(200);
    if (!activeJobId) {
      return null;
    }
    return mockJobService.getJob(activeJobId);
  }

  private async simulateProgress(jobId: string): Promise<void> {
    mockJobService.updateJob(jobId, { status: 'processing', progress: 5 });
    await delay(1500);
    mockJobService.updateJob(jobId, { progress: 18 });
    await delay(1500);
    mockJobService.updateJob(jobId, { progress: 35 });
  }
}

export const mockPipelineService = new MockPipelineService();
