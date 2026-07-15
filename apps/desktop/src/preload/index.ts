import { contextBridge } from 'electron';

const api = {
  platform: process.platform,
} as const;

contextBridge.exposeInMainWorld('dubforge', api);

export type DubForgeApi = typeof api;
