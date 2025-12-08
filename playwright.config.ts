import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3025',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'iPhone 14 Pro',
      use: {
        ...devices['iPhone 14 Pro'],
        headless: false,
      },
    },
    {
      name: 'iPhone 14',
      use: {
        ...devices['iPhone 14'],
        headless: false,
      },
    },
    {
      name: 'iPad Pro 11',
      use: {
        ...devices['iPad Pro 11'],
        headless: false,
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3025',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
