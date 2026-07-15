import {
  PipelineEngine,
  FileWorkflowStore,
  workflowStateToJob,
  type StartWorkflowRequest,
} from '@dubforge/pipeline';
import {
  createExtensionRuntime,
  loadBuiltinExtensions,
  type ExtensionRuntime,
} from '@dubforge/providers';
import type { Job, StartJobRequest } from '@dubforge/types';
import { createAppId } from '@dubforge/shared';
import type { PipelineEventPayload } from '@dubforge/shared';
import type { WorkflowEvent } from '@dubforge/pipeline';
import { join } from 'node:path';
import type { VideoCacheService } from './video-cache-service';

export class PipelineJobService {
  private readonly engine: PipelineEngine;
  private activeJob: Job | null = null;
  private activeRequest: StartWorkflowRequest | null = null;
  private activeLanguages: readonly string[] = [];
  private runPromise: Promise<void> | null = null;
  private eventPublisher: ((event: PipelineEventPayload) => void) | null = null;

  constructor(
    private readonly cacheService: VideoCacheService,
    private readonly jobsRoot: string,
    runtime: ExtensionRuntime,
  ) {
    this.engine = new PipelineEngine({
      runtime,
      store: new FileWorkflowStore(),
      maxConcurrency: 4,
    });

    this.engine.getEventBus().subscribe((event: WorkflowEvent) => {
      this.eventPublisher?.({
        type: event.type,
        workflowId: event.workflowId,
        jobId: event.jobId,
        timestamp: event.timestamp,
        nodeId: 'nodeId' in event ? event.nodeId : undefined,
        progress: 'progress' in event ? event.progress : undefined,
      });
      this.publishActiveJob();
    });
  }

  setEventPublisher(publisher: (event: PipelineEventPayload) => void): void {
    this.eventPublisher = publisher;
  }

  getActiveJob(): Job | null {
    return this.activeJob;
  }

  async startJob(request: StartJobRequest): Promise<Job> {
    if (this.runPromise !== null) {
      throw new Error('A localization job is already running.');
    }

    const cachedRecord = await this.cacheService.readCachedRecord(request.video.id);
    if (cachedRecord === null) {
      throw new Error('Video cache record was not found. Re-import the video and try again.');
    }

    const jobId = createAppId();
    const workflowId = createAppId();
    const artifactRoot = join(this.jobsRoot, jobId);
    const targetLanguages = request.languages.filter((language) => language !== 'en');

    const workflowRequest: StartWorkflowRequest = {
      workflowId,
      jobId,
      videoPath: cachedRecord.filePath,
      videoFilename: request.video.filename,
      durationSeconds: request.video.durationSeconds,
      targetLanguages,
      profile: request.profile,
      output: {
        ...request.output,
        containerFormat: 'mkv',
      },
      outputDirectory: request.outputDirectory,
      artifactRoot,
    };

    this.activeRequest = workflowRequest;
    this.activeLanguages = request.languages;
    this.activeJob = {
      id: jobId,
      filename: request.video.filename,
      status: 'processing',
      languages: request.languages,
      progress: 0,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      durationSeconds: null,
      outputPath: request.outputDirectory,
      stages: [],
      timeline: [],
      error: null,
    };

    this.runPromise = this.runWorkflow(workflowRequest, request).finally(() => {
      this.runPromise = null;
    });

    return this.activeJob;
  }

  cancelJob(jobId: string): void {
    if (this.activeJob?.id !== jobId) {
      return;
    }

    this.engine.cancel();
  }

  private async runWorkflow(
    workflowRequest: StartWorkflowRequest,
    request: StartJobRequest,
  ): Promise<void> {
    try {
      const finalState = await this.engine.start(workflowRequest);
      this.activeJob = workflowStateToJob(
        finalState,
        request.video.filename,
        request.languages,
        request.outputDirectory,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pipeline execution failed.';
      this.activeJob = {
        id: workflowRequest.jobId,
        filename: request.video.filename,
        status: 'failed',
        languages: request.languages,
        progress: this.activeJob?.progress ?? 0,
        startedAt: this.activeJob?.startedAt ?? new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationSeconds: null,
        outputPath: request.outputDirectory,
        stages: this.activeJob?.stages ?? [],
        timeline: this.activeJob?.timeline ?? [],
        error: {
          title: 'Localization failed',
          description: message,
          recoveryAction: 'Review the workflow timeline and retry the job.',
        },
      };
    }
  }

  private publishActiveJob(): void {
    const state = this.engine.getActiveState();
    const request = this.activeRequest;
    if (state === null || request === null) {
      return;
    }

    this.activeJob = workflowStateToJob(
      state,
      request.videoFilename,
      this.activeLanguages,
      request.outputDirectory,
    );
  }
}

export async function createPipelineJobService(
  cacheService: VideoCacheService,
  jobsRoot: string,
): Promise<PipelineJobService> {
  const runtime = createExtensionRuntime();
  await loadBuiltinExtensions(runtime);
  return new PipelineJobService(cacheService, jobsRoot, runtime);
}
