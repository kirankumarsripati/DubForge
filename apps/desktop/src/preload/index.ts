import { contextBridge } from 'electron';
import type { DubForgeApi } from '@dubforge/shared';
import { createDubForgeApi } from './api';

const api: DubForgeApi = createDubForgeApi();

contextBridge.exposeInMainWorld('dubforge', api);

export type { DubForgeApi };
