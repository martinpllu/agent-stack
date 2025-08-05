import { defineConfig, devices } from '@playwright/test';
import { getDevServerUrl } from './scripts/get-dev-server-url';

// Dynamically detect the dev server URL to avoid hardcoding ports
const baseURL = process.env.BASE_URL || getDevServerUrl();
console.log(`Using base URL: ${baseURL}`);

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid auth conflicts
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Don't start a new server - expect SST dev to be running
    // as per the SST development workflow documentation
    command: 'echo "Expecting SST dev server to be already running"',
    url: baseURL,
    reuseExistingServer: true, // Always reuse existing server
    timeout: 5 * 1000, // Short timeout since server should already be running
  },
});