
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/visual',
  fullyParallel: false, // Sequential for consistent visual comparisons
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker for visual consistency
  timeout: 30000,
  expect: {
    // Visual comparison thresholds
    toHaveScreenshot: { threshold: 0.2, mode: 'pixel' },
    toMatchScreenshot: { threshold: 0.2 }
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report/visual' }],
    ['json', { outputFile: 'playwright-report/visual-results.json' }],
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
      name: 'visual-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Ensure consistent rendering
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
          ]
        }
      },
    },
    {
      name: 'visual-firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'visual-mobile',
      use: { ...devices['iPhone 12'] },
    }
  ],

  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
