import type { AssetDiagnostics, AsyncState, Model, VerificationReport } from '@dubforge/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { modelService } from '../services';

interface ModelsStoreState {
  readonly models: AsyncState<readonly Model[]>;
  readonly diagnosticsByModelId: Readonly<Record<string, AssetDiagnostics>>;
  readonly latestVerificationByModelId: Readonly<Record<string, VerificationReport>>;
  readonly expandedDiagnosticsId: string | null;
  fetchModels: () => Promise<void>;
  downloadModel: (id: string) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  updateModel: (id: string) => Promise<void>;
  verifyModel: (id: string) => Promise<void>;
  repairModel: (id: string) => Promise<void>;
  fetchDiagnostics: (id: string) => Promise<void>;
  toggleDiagnostics: (id: string) => void;
  subscribeToChanges: () => () => void;
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
      diagnosticsByModelId: {},
      latestVerificationByModelId: {},
      expandedDiagnosticsId: null,
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
      verifyModel: async (id) => {
        const result = await modelService.verifyModel(id);
        set((state) => ({
          latestVerificationByModelId: {
            ...state.latestVerificationByModelId,
            [id]: result.verificationReport,
          },
          expandedDiagnosticsId: id,
        }));
        await get().fetchDiagnostics(id);
        await get().fetchModels();
      },
      repairModel: async (id) => {
        await modelService.repairModel(id);
        await get().fetchModels();
      },
      fetchDiagnostics: async (id) => {
        const diagnostics = await modelService.getDiagnostics(id);
        set((state) => ({
          diagnosticsByModelId: {
            ...state.diagnosticsByModelId,
            [id]: diagnostics,
          },
        }));
      },
      toggleDiagnostics: (id) => {
        const expanded = get().expandedDiagnosticsId;
        const nextExpanded = expanded === id ? null : id;
        set({ expandedDiagnosticsId: nextExpanded });
        if (nextExpanded !== null) {
          void get().fetchDiagnostics(nextExpanded);
        }
      },
      subscribeToChanges: () => {
        return modelService.subscribe(() => {
          void get().fetchModels();
        });
      },
    }),
    { name: 'models-store' },
  ),
);
