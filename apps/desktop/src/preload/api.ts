import { ipcRenderer, webUtils } from 'electron';
import { VIDEO_IPC_CHANNELS, type DubForgeApi } from '@dubforge/shared';

export function createDubForgeApi(): DubForgeApi {
  return {
    platform: process.platform,
    video: {
      selectFile: () => ipcRenderer.invoke(VIDEO_IPC_CHANNELS.SELECT_FILE),
      inspectFile: (filePath) => ipcRenderer.invoke(VIDEO_IPC_CHANNELS.INSPECT_FILE, { filePath }),
      listRecentFiles: () => ipcRenderer.invoke(VIDEO_IPC_CHANNELS.LIST_RECENT),
      openRecentFile: (id) => ipcRenderer.invoke(VIDEO_IPC_CHANNELS.OPEN_RECENT, { id }),
    },
    files: {
      getPathForFile: (file) => webUtils.getPathForFile(file),
    },
  };
}
