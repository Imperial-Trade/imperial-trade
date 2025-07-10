
import { test, expect } from '@playwright/test';

test.describe('Trading Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login as trader
    await page.goto('/login');
    await page.fill('input[type="email"]', 'trader@test.com');
    await page.fill('input[type="password"]', 'traderpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('can create trade alert', async ({ page }) => {
    await page.goto('/dashboard/signals');
    
    // Click create new alert button
    await page.click('button:has-text("Create Alert")');
    
    // Fill out trade alert form
    await page.fill('input[name="asset_name"]', 'Gold');
    await page.fill('input[name="finnhub_symbol"]', 'XAU/USD');
    await page.selectOption('select[name="trade_type"]', 'buy');
    await page.fill('input[name="entry_price"]', '2000');
    await page.fill('input[name="stop_loss"]', '1950');
    await page.fill('input[name="tp1"]', '2050');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Verify alert was created
    await expect(page.locator('.toast')).toContainText('Trade alert created');
    await expect(page.locator('text=Gold')).toBeVisible();
  });

  test('can view trading signals', async ({ page }) => {
    await page.goto('/dashboard/signals');
    
    // Should display trading signals
    await expect(page.locator('h1')).toContainText('Trading Signals');
    
    // Check for signal components
    await expect(page.locator('[data-testid="trade-signal"]')).toBeVisible();
  });
});
