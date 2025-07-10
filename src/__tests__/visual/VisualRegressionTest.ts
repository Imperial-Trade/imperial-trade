
import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface VisualTestConfig {
  name: string;
  url: string;
  selector?: string;
  viewport?: { width: number; height: number };
  threshold?: number;
  maskElements?: string[];
}

class VisualRegressionTester {
  private baselinePath = './visual-baselines';
  private resultsPath = './visual-results';
  
  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories() {
    [this.baselinePath, this.resultsPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async captureBaseline(page: Page, config: VisualTestConfig) {
    if (config.viewport) {
      await page.setViewportSize(config.viewport);
    }

    await page.goto(config.url);
    await page.waitForLoadState('networkidle');

    // Mask dynamic elements
    if (config.maskElements) {
      for (const selector of config.maskElements) {
        await page.locator(selector).evaluateAll(elements => {
          elements.forEach(el => {
            (el as HTMLElement).style.backgroundColor = '#000000';
            (el as HTMLElement).style.color = '#000000';
          });
        });
      }
    }

    const element = config.selector ? page.locator(config.selector) : page;
    const screenshotPath = path.join(this.baselinePath, `${config.name}.png`);
    
    await element.screenshot({ 
      path: screenshotPath,
      fullPage: !config.selector
    });

    console.log(`✅ Baseline captured: ${config.name}`);
  }

  async compareVisual(page: Page, config: VisualTestConfig): Promise<boolean> {
    if (config.viewport) {
      await page.setViewportSize(config.viewport);
    }

    await page.goto(config.url);
    await page.waitForLoadState('networkidle');

    // Mask dynamic elements
    if (config.maskElements) {
      for (const selector of config.maskElements) {
        await page.locator(selector).evaluateAll(elements => {
          elements.forEach(el => {
            (el as HTMLElement).style.backgroundColor = '#000000';
            (el as HTMLElement).style.color = '#000000';
          });
        });
      }
    }

    const element = config.selector ? page.locator(config.selector) : page;
    const baselinePath = path.join(this.baselinePath, `${config.name}.png`);
    
    if (!fs.existsSync(baselinePath)) {
      throw new Error(`Baseline not found for ${config.name}. Run with --update-snapshots first.`);
    }

    // Compare with baseline
    await expect(element).toHaveScreenshot(`${config.name}.png`, {
      threshold: config.threshold || 0.2,
      maxDiffPixels: 100
    });

    return true;
  }

  generateVisualReport(results: Array<{ config: VisualTestConfig; passed: boolean; error?: string }>) {
    const reportPath = path.join(this.resultsPath, 'visual-report.html');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Visual Regression Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-result { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .passed { background-color: #d4edda; border-color: #c3e6cb; }
        .failed { background-color: #f8d7da; border-color: #f5c6cb; }
        .screenshot { max-width: 300px; margin: 10px 0; }
        .summary { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>Visual Regression Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Tests: ${results.length}</p>
        <p>Passed: ${results.filter(r => r.passed).length}</p>
        <p>Failed: ${results.filter(r => !r.passed).length}</p>
        <p>Generated: ${new Date().toISOString()}</p>
    </div>
    
    ${results.map(result => `
        <div class="test-result ${result.passed ? 'passed' : 'failed'}">
            <h3>${result.config.name} - ${result.passed ? 'PASSED' : 'FAILED'}</h3>
            <p><strong>URL:</strong> ${result.config.url}</p>
            ${result.config.selector ? `<p><strong>Selector:</strong> ${result.config.selector}</p>` : ''}
            ${result.config.viewport ? `<p><strong>Viewport:</strong> ${result.config.viewport.width}x${result.config.viewport.height}</p>` : ''}
            ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
        </div>
    `).join('')}
</body>
</html>`;

    fs.writeFileSync(reportPath, html);
    console.log(`📊 Visual report generated: ${reportPath}`);
  }
}

export { VisualRegressionTester, VisualTestConfig };
