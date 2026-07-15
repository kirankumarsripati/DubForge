import { ipcMain, type WebContents } from 'electron';
import {
  cancelPipelineJobRequestSchema,
  PIPELINE_IPC_CHANNELS,
  pipelineEventSchema,
  pipelineJobResponseSchema,
  startPipelineJobRequestSchema,
} from '@dubforge/shared';
import type { ServiceContainer } from '@dubforge/shared';
import { PIPELINE_JOB_SERVICE_TOKEN } from '../container';

const subscribedRenderers = new Set<WebContents>();

export function registerPipelineIpcHandlers(container: ServiceContainer): void {
  const pipelineService = container.resolve(PIPELINE_JOB_SERVICE_TOKEN);

  ipcMain.handle(PIPELINE_IPC_CHANNELS.START_JOB, async (_event, payload: unknown) => {
    const request = startPipelineJobRequestSchema.parse(payload);
    const job = await pipelineService.startJob(request);
    return pipelineJobResponseSchema.parse(job);
  });

  ipcMain.handle(PIPELINE_IPC_CHANNELS.CANCEL_JOB, (_event, payload: unknown) => {
    const request = cancelPipelineJobRequestSchema.parse(payload);
    pipelineService.cancelJob(request.jobId);
  });

  ipcMain.handle(PIPELINE_IPC_CHANNELS.GET_ACTIVE_JOB, () => {
    const job = pipelineService.getActiveJob();
    return job === null ? null : pipelineJobResponseSchema.parse(job);
  });

  ipcMain.on(PIPELINE_IPC_CHANNELS.SUBSCRIBE_EVENTS, (event) => {
    subscribedRenderers.add(event.sender);
    event.sender.once('destroyed', () => {
      subscribedRenderers.delete(event.sender);
    });
  });

  pipelineService.setEventPublisher((event) => {
    const payload = pipelineEventSchema.parse(event);
    for (const webContents of subscribedRenderers) {
      if (!webContents.isDestroyed()) {
        webContents.send(PIPELINE_IPC_CHANNELS.EVENT, payload);
      }
    }
  });
}
