
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('complete account request workflow', async ({ page }) => {
    // Navigate to account request page
    await page.goto('/account-request');
    
    // Fill out account request form
    await page.fill('input[name="full_name"]', 'Test User');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.selectOption('select[name="account_type"]', 'member');
    await page.fill('textarea[name="reason"]', 'Testing account request workflow');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('.toast')).toContainText('Account request submitted');
    
    // Navigate to admin panel (would need admin credentials)
    // This would continue with admin approval workflow
  });

  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('prevents access to admin panel for non-admin users', async ({ page }) => {
    // Login as regular user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@test.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // Try to access admin panel
    await page.goto('/dashboard/admin');
    
    // Should show access denied
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });
});
