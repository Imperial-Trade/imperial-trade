
import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'adminpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('displays admin panel with all tabs', async ({ page }) => {
    await page.goto('/dashboard/admin');
    
    // Check that all admin tabs are present
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('text=Requests')).toBeVisible();
    await expect(page.locator('text=System')).toBeVisible();
    await expect(page.locator('text=Monitor')).toBeVisible();
    await expect(page.locator('text=Alerts')).toBeVisible();
    await expect(page.locator('text=Audit')).toBeVisible();
    await expect(page.locator('text=Trades')).toBeVisible();
  });

  test('can manage users', async ({ page }) => {
    await page.goto('/dashboard/admin');
    
    // Click on Users tab
    await page.click('text=Users');
    
    // Should display user management table
    await expect(page.locator('table')).toBeVisible();
    
    // Test user actions (create, edit, etc.)
    // This would be expanded based on actual implementation
  });

  test('can view system statistics', async ({ page }) => {
    await page.goto('/dashboard/admin');
    
    // Check system overview cards
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Active Users')).toBeVisible();
    await expect(page.locator('text=Total Trades')).toBeVisible();
    await expect(page.locator('text=Pending Requests')).toBeVisible();
    await expect(page.locator('text=System Health')).toBeVisible();
  });
});
