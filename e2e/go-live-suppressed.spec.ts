import { test, expect } from '@playwright/test';

test.describe('Go-Live: Suppressed Email Flow', () => {
  test('account request with email suppressed', async ({ page }) => {
    const testEmail = `test-suppressed-${Date.now()}@example.com`;
    
    // Navigate to account request page
    await page.goto('/account-request');
    
    // Fill and submit form
    await page.fill('input[name="full_name"]', 'Test Suppressed User');
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="account_type"]', 'member');
    await page.fill('textarea[name="reason"]', 'Testing suppressed email flow');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message (should still succeed even with email suppressed)
    await expect(page.locator('.toast')).toContainText('Account request submitted successfully');
    
    // Verify request appears in status page
    await page.goto('/account-request-status');
    await page.fill('input[type="email"]', testEmail);
    await page.click('button[type="submit"]');
    
    // Should show pending status
    await expect(page.locator('text=pending')).toBeVisible();
  });

  test('rate limit enforcement with email suppressed', async ({ page }) => {
    const baseEmail = `rate-test-${Date.now()}`;
    
    // Submit first request (should succeed)
    await page.goto('/account-request');
    await page.fill('input[name="full_name"]', 'Rate Test 1');
    await page.fill('input[name="email"]', `${baseEmail}-1@example.com`);
    await page.selectOption('select[name="account_type"]', 'member');
    await page.fill('textarea[name="reason"]', 'Rate limit test 1');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.toast')).toContainText('Account request submitted successfully');
    
    // Submit duplicate email (should fail)
    await page.goto('/account-request');
    await page.fill('input[name="full_name"]', 'Rate Test Duplicate');
    await page.fill('input[name="email"]', `${baseEmail}-1@example.com`);
    await page.selectOption('select[name="account_type"]', 'member');
    await page.fill('textarea[name="reason"]', 'Duplicate email test');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.toast')).toContainText('already submitted');
    
    // Submit multiple rapid requests to trigger rate limit
    for (let i = 2; i <= 5; i++) {
      await page.goto('/account-request');
      await page.fill('input[name="full_name"]', `Rate Test ${i}`);
      await page.fill('input[name="email"]', `${baseEmail}-${i}@example.com`);
      await page.selectOption('select[name="account_type"]', 'member');
      await page.fill('textarea[name="reason"]', `Rate limit test ${i}`);
      await page.click('button[type="submit"]');
      
      if (i <= 3) {
        await expect(page.locator('.toast')).toContainText('Account request submitted successfully');
      } else {
        // Should hit rate limit
        await expect(page.locator('.toast')).toContainText('rate limit');
      }
    }
  });

  test('password reset flow (unchanged)', async ({ page }) => {
    await page.goto('/login');
    
    // Click forgot password link
    await page.click('text=Forgot password?');
    
    // Fill email for password reset
    await page.fill('input[type="email"]', 'test-reset@example.com');
    await page.click('button:has-text("Send Reset Email")');
    
    // Should show success message even if email is suppressed
    await expect(page.locator('text=reset email sent')).toBeVisible();
  });
});