
import { test, expect } from '@playwright/test';
import { VisualRegressionTester, VisualTestConfig } from './VisualRegressionTest';

const visualTests: VisualTestConfig[] = [
  {
    name: 'dashboard-home',
    url: '/dashboard/home',
    viewport: { width: 1920, height: 1080 },
    maskElements: ['.live-price', '.timestamp', '[data-testid="current-time"]'],
    threshold: 0.2
  },
  {
    name: 'admin-panel',
    url: '/dashboard/admin-panel',
    viewport: { width: 1920, height: 1080 },
    maskElements: ['.last-login', '.created-at', '.updated-at'],
    threshold: 0.2
  },
  {
    name: 'signals-page',
    url: '/dashboard/signal-stream',
    viewport: { width: 1920, height: 1080 },
    maskElements: ['.price-display', '.timestamp', '.live-indicator'],
    threshold: 0.2
  },
  {
    name: 'landing-page',
    url: '/',
    viewport: { width: 1920, height: 1080 },
    threshold: 0.2
  },
  {
    name: 'mobile-dashboard',
    url: '/dashboard/home',
    viewport: { width: 390, height: 844 },
    maskElements: ['.live-price', '.timestamp'],
    threshold: 0.3
  }
];

const tester = new VisualRegressionTester();

test.describe('Visual Regression Tests', () => {
  for (const config of visualTests) {
    test(`Visual test: ${config.name}`, async ({ page }) => {
      await tester.compareVisual(page, config);
    });
  }
});

test.describe('Visual Baseline Generation', () => {
  test.skip('Generate visual baselines', async ({ page }) => {
    const results = [];
    
    for (const config of visualTests) {
      try {
        await tester.captureBaseline(page, config);
        results.push({ config, passed: true });
      } catch (error) {
        results.push({ 
          config, 
          passed: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    tester.generateVisualReport(results);
  });
});
