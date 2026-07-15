import type { AsyncState, Model } from '@dubforge/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { modelService, setMockModelsSimulateError } from '../services';

interface ModelsStoreState {
  readonly models: AsyncState<readonly Model[]>;
  fetchModels: () => Promise<void>;
  downloadModel: (id: string) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  updateModel: (id: string) => Promise<void>;
  setSimulateError: (value: boolean) => void;
}

const initialState: AsyncState<readonly Model[]> = {
  status: 'idle',
  data: null,
  error: null,
};

export const useModelsStore = create<ModelsStoreState>()(
  devtools(
    (set, get) => ({
      models: initialState,
      fetchModels: async () => {
        set({ models: { status: 'loading', data: get().models.data, error: null } });
        try {
          const data = await modelService.listModels();
          set({ models: { status: 'success', data, error: null } });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load models';
          set({ models: { status: 'error', data: null, error: message } });
        }
      },
      downloadModel: async (id) => {
        await modelService.downloadModel(id);
        await get().fetchModels();
      },
      deleteModel: async (id) => {
        await modelService.deleteModel(id);
        await get().fetchModels();
      },
      updateModel: async (id) => {
        await modelService.updateModel(id);
        await get().fetchModels();
      },
      setSimulateError: (value) => {
        setMockModelsSimulateError(value);
      },
    }),
    { name: 'models-store' },
  ),
);
