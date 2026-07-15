import type { AppInfo, AppService } from '@dubforge/types';
import { MOCK_APP_INFO } from './mock-data';
import { delay } from './mock-utils';

export class MockAppService implements AppService {
  async getAppInfo(): Promise<AppInfo> {
    await delay(300);
    return MOCK_APP_INFO;
  }
}

export const mockAppService = new MockAppService();
