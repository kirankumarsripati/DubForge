import type { Model, VerifyModelResult } from '@dubforge/types';

function toModel(response: Model): Model {
  return response;
}

export class IpcModelService {
  async listModels(): Promise<readonly Model[]> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Models bridge is unavailable.');
    }

    const models = await api.models.listModels();
    return models.map(toModel);
  }

  async downloadModel(id: string): Promise<Model> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Models bridge is unavailable.');
    }

    return toModel(await api.models.downloadModel(id));
  }

  async deleteModel(id: string): Promise<void> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Models bridge is unavailable.');
    }

    await api.models.deleteModel(id);
  }

  async updateModel(id: string): Promise<Model> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Models bridge is unavailable.');
    }

    return toModel(await api.models.updateModel(id));
  }

  async verifyModel(id: string): Promise<VerifyModelResult> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Models bridge is unavailable.');
    }

    return api.models.verifyModel(id);
  }

  async getDiagnostics(id: string): Promise<AssetDiagnostics> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Models bridge is unavailable.');
    }

    return api.models.getDiagnostics(id);
  }

  async repairModel(id: string): Promise<Model> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Models bridge is unavailable.');
    }

    return toModel(await api.models.repairModel(id));
  }

  subscribe(listener: () => void): () => void {
    const api = window.dubforge;
    if (api === undefined) {
      return () => undefined;
    }

    return api.models.subscribeEvents(() => {
      listener();
    });
  }
}

export const ipcModelService = new IpcModelService();
