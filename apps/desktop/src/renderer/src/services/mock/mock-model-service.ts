import type { Model, ModelService } from '@dubforge/types';
import { MOCK_MODELS } from './mock-data';
import { delay } from './mock-utils';

let modelsState: Model[] = [...MOCK_MODELS];
let simulateError = false;

export function setMockModelsSimulateError(value: boolean): void {
  simulateError = value;
}

export class MockModelService implements ModelService {
  async listModels(): Promise<readonly Model[]> {
    await delay();
    if (simulateError) {
      throw new Error('Unable to load models. Check your network connection and try again.');
    }
    return [...modelsState];
  }

  async downloadModel(id: string): Promise<Model> {
    await delay(800);
    const index = modelsState.findIndex((model) => model.id === id);
    if (index === -1) {
      throw new Error('Model not found');
    }
    const existing = modelsState[index];
    if (!existing) {
      throw new Error('Model not found');
    }
    const downloading: Model = { ...existing, status: 'downloading', downloadProgress: 0 };
    modelsState = [...modelsState.slice(0, index), downloading, ...modelsState.slice(index + 1)];

    await delay(1200);
    const installed: Model = { ...downloading, status: 'installed', downloadProgress: null };
    modelsState = [...modelsState.slice(0, index), installed, ...modelsState.slice(index + 1)];
    return installed;
  }

  async deleteModel(id: string): Promise<void> {
    await delay(400);
    const index = modelsState.findIndex((model) => model.id === id);
    if (index === -1) {
      throw new Error('Model not found');
    }
    const existing = modelsState[index];
    if (!existing) {
      throw new Error('Model not found');
    }
    const missing: Model = { ...existing, status: 'missing', downloadProgress: null };
    modelsState = [...modelsState.slice(0, index), missing, ...modelsState.slice(index + 1)];
  }

  async updateModel(id: string): Promise<Model> {
    await delay(600);
    const index = modelsState.findIndex((model) => model.id === id);
    if (index === -1) {
      throw new Error('Model not found');
    }
    const existing = modelsState[index];
    if (!existing) {
      throw new Error('Model not found');
    }
    const updating: Model = { ...existing, status: 'updating' };
    modelsState = [...modelsState.slice(0, index), updating, ...modelsState.slice(index + 1)];

    await delay(800);
    const updated: Model = { ...updating, status: 'ready' };
    modelsState = [...modelsState.slice(0, index), updated, ...modelsState.slice(index + 1)];
    return updated;
  }
}

export const mockModelService = new MockModelService();
