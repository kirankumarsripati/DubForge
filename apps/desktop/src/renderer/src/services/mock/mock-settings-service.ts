import type { AppSettings, SettingsService } from '@dubforge/types';
import { MOCK_DEFAULT_SETTINGS } from './mock-data';
import { delay } from './mock-utils';

let settingsState: AppSettings = { ...MOCK_DEFAULT_SETTINGS };
let simulateError = false;

export function setMockSettingsSimulateError(value: boolean): void {
  simulateError = value;
}

export class MockSettingsService implements SettingsService {
  async getSettings(): Promise<AppSettings> {
    await delay();
    if (simulateError) {
      throw new Error('Unable to load settings. Preferences file may be corrupted.');
    }
    return { ...settingsState };
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    await delay(400);
    settingsState = { ...settingsState, ...partial };
    return { ...settingsState };
  }

  getSettingsSync(): AppSettings {
    return { ...settingsState };
  }
}

export const mockSettingsService = new MockSettingsService();
