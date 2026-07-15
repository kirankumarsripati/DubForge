import { test, expect, _electron as electron } from '@playwright/test';
import { join } from 'node:path';

test.describe('DubForge Desktop', () => {
  test('launches and shows home screen', async () => {
    const app = await electron.launch({
      args: [join(__dirname, '../../apps/desktop/out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    await expect(window.locator('h1')).toContainText('DubForge');
    await expect(window.locator('text=Import Video')).toBeVisible();

    await app.close();
  });
});
