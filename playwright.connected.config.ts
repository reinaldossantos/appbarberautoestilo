import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/connected',
  timeout: 90000,
  workers: 1,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:3000', trace: 'off', screenshot: 'off', video: 'off' },
  webServer: { command: 'npm run start', url: 'http://127.0.0.1:3000', reuseExistingServer: false, timeout: 120000 },
});
