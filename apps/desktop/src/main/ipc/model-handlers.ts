import { ipcMain, type WebContents } from 'electron';

import {
  MODEL_IPC_CHANNELS,
  assetDiagnosticsResponseSchema,
  modelIdRequestSchema,
  modelResponseSchema,
  modelsChangedEventSchema,
  verifyModelResponseSchema,
} from '@dubforge/shared';
import type { ServiceContainer } from '@dubforge/shared';

import { DESKTOP_MODEL_SERVICE_TOKEN } from '../container';

const subscribedRenderers = new Set<WebContents>();

export function registerModelIpcHandlers(container: ServiceContainer): void {
  const modelService = container.resolve(DESKTOP_MODEL_SERVICE_TOKEN);

  ipcMain.handle(MODEL_IPC_CHANNELS.LIST_MODELS, () => {
    return modelService.listModels().map((model) => modelResponseSchema.parse(model));
  });

  ipcMain.handle(MODEL_IPC_CHANNELS.DOWNLOAD_MODEL, async (_event, payload: unknown) => {
    const request = modelIdRequestSchema.parse(payload);
    const model = await modelService.downloadModel(request.id);
    return modelResponseSchema.parse(model);
  });

  ipcMain.handle(MODEL_IPC_CHANNELS.DELETE_MODEL, async (_event, payload: unknown) => {
    const request = modelIdRequestSchema.parse(payload);
    await modelService.deleteModel(request.id);
  });

  ipcMain.handle(MODEL_IPC_CHANNELS.UPDATE_MODEL, async (_event, payload: unknown) => {
    const request = modelIdRequestSchema.parse(payload);
    const model = await modelService.updateModel(request.id);
    return modelResponseSchema.parse(model);
  });

  ipcMain.handle(MODEL_IPC_CHANNELS.VERIFY_MODEL, async (_event, payload: unknown) => {
    const request = modelIdRequestSchema.parse(payload);
    const result = await modelService.verifyModel(request.id);
    return verifyModelResponseSchema.parse(result);
  });

  ipcMain.handle(MODEL_IPC_CHANNELS.GET_DIAGNOSTICS, async (_event, payload: unknown) => {
    const request = modelIdRequestSchema.parse(payload);
    return assetDiagnosticsResponseSchema.parse(modelService.getDiagnostics(request.id));
  });

  ipcMain.handle(MODEL_IPC_CHANNELS.REPAIR_MODEL, async (_event, payload: unknown) => {
    const request = modelIdRequestSchema.parse(payload);
    const model = await modelService.repairModel(request.id);
    return modelResponseSchema.parse(model);
  });

  ipcMain.on(MODEL_IPC_CHANNELS.SUBSCRIBE_EVENTS, (event) => {
    subscribedRenderers.add(event.sender);
    event.sender.once('destroyed', () => {
      subscribedRenderers.delete(event.sender);
    });
  });

  modelService.setChangeListener(() => {
    const payload = modelsChangedEventSchema.parse({ type: 'models-changed' });
    for (const webContents of subscribedRenderers) {
      if (!webContents.isDestroyed()) {
        webContents.send(MODEL_IPC_CHANNELS.EVENT, payload);
      }
    }
  });
}
