
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/load',
  fullyParallel: false, // Sequential execution for load tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Fewer retries for load tests
  workers: 1, // Single worker for consistent load testing
  timeout: 60000, // Longer timeout for load tests
  reporter: [
    ['html', { outputFolder: 'playwright-report/load' }],
    ['json', { outputFile: 'playwright-report/load-results.json' }],
    ['line']
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'load-testing-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        // Reduce resources per browser for load testing
        launchOptions: {
          args: [
            '--memory-pressure-off',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows'
          ]
        }
      },
    }
  ],

  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
