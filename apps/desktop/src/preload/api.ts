import { ipcRenderer, webUtils } from 'electron';
import {
  MODEL_IPC_CHANNELS,
  PIPELINE_IPC_CHANNELS,
  VIDEO_IPC_CHANNELS,
  type DubForgeApi,
  type ModelsChangedEvent,
} from '@dubforge/shared';
import type { PipelineEventPayload } from '@dubforge/shared';

export function createDubForgeApi(): DubForgeApi {
  return {
    platform: process.platform,
    video: {
      selectFile: () => ipcRenderer.invoke(VIDEO_IPC_CHANNELS.SELECT_FILE),
      inspectFile: (filePath) => ipcRenderer.invoke(VIDEO_IPC_CHANNELS.INSPECT_FILE, { filePath }),
      listRecentFiles: () => ipcRenderer.invoke(VIDEO_IPC_CHANNELS.LIST_RECENT),
      openRecentFile: (id) => ipcRenderer.invoke(VIDEO_IPC_CHANNELS.OPEN_RECENT, { id }),
      getFfprobeDiagnostics: () => ipcRenderer.invoke(VIDEO_IPC_CHANNELS.GET_FFPROBE_DIAGNOSTICS),
    },
    files: {
      getPathForFile: (file) => webUtils.getPathForFile(file),
    },
    pipeline: {
      startJob: (request) => ipcRenderer.invoke(PIPELINE_IPC_CHANNELS.START_JOB, request),
      cancelJob: (jobId) => ipcRenderer.invoke(PIPELINE_IPC_CHANNELS.CANCEL_JOB, { jobId }),
      getActiveJob: () => ipcRenderer.invoke(PIPELINE_IPC_CHANNELS.GET_ACTIVE_JOB),
      subscribeEvents: (listener) => {
        ipcRenderer.send(PIPELINE_IPC_CHANNELS.SUBSCRIBE_EVENTS);
        const handler = (
          _event: Electron.IpcRendererEvent,
          payload: PipelineEventPayload,
        ): void => {
          listener(payload);
        };
        ipcRenderer.on(PIPELINE_IPC_CHANNELS.EVENT, handler);
        return () => {
          ipcRenderer.removeListener(PIPELINE_IPC_CHANNELS.EVENT, handler);
        };
      },
    },
    models: {
      listModels: () => ipcRenderer.invoke(MODEL_IPC_CHANNELS.LIST_MODELS),
      downloadModel: (id) => ipcRenderer.invoke(MODEL_IPC_CHANNELS.DOWNLOAD_MODEL, { id }),
      deleteModel: (id) => ipcRenderer.invoke(MODEL_IPC_CHANNELS.DELETE_MODEL, { id }),
      updateModel: (id) => ipcRenderer.invoke(MODEL_IPC_CHANNELS.UPDATE_MODEL, { id }),
      verifyModel: (id) => ipcRenderer.invoke(MODEL_IPC_CHANNELS.VERIFY_MODEL, { id }),
      repairModel: (id) => ipcRenderer.invoke(MODEL_IPC_CHANNELS.REPAIR_MODEL, { id }),
      subscribeEvents: (listener) => {
        ipcRenderer.send(MODEL_IPC_CHANNELS.SUBSCRIBE_EVENTS);
        const handler = (_event: Electron.IpcRendererEvent, payload: ModelsChangedEvent): void => {
          listener(payload);
        };
        ipcRenderer.on(MODEL_IPC_CHANNELS.EVENT, handler);
        return () => {
          ipcRenderer.removeListener(MODEL_IPC_CHANNELS.EVENT, handler);
        };
      },
    },
  };
}
