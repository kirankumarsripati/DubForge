import type { AppSettings, AsyncState } from '@dubforge/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { setMockSettingsSimulateError, settingsService } from '../services';

interface SettingsStoreState {
  readonly settings: AsyncState<AppSettings>;
  fetchSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  setSimulateError: (value: boolean) => void;
}

const initialState: AsyncState<AppSettings> = {
  status: 'idle',
  data: null,
  error: null,
};

export const useSettingsStore = create<SettingsStoreState>()(
  devtools(
    (set, get) => ({
      settings: initialState,
      fetchSettings: async () => {
        set({ settings: { status: 'loading', data: get().settings.data, error: null } });
        try {
          const data = await settingsService.getSettings();
          set({ settings: { status: 'success', data, error: null } });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load settings';
          set({ settings: { status: 'error', data: null, error: message } });
        }
      },
      updateSettings: async (partial) => {
        const updated = await settingsService.updateSettings(partial);
        set({ settings: { status: 'success', data: updated, error: null } });
      },
      setSimulateError: (value) => {
        setMockSettingsSimulateError(value);
      },
    }),
    { name: 'settings-store' },
  ),
);
