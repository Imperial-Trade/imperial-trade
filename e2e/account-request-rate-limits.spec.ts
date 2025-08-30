
import { test, expect } from '@playwright/test';

test.describe('Account Request Rate Limits', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  
  test('should allow first account request submission', async ({ page }) => {
    await page.goto('/account-request');
    
    // Fill out the form
    await page.fill('input[name="full_name"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="account_type"]', 'user');
    await page.fill('textarea[name="reason"]', 'Testing the account request flow');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should see success message
    await expect(page.locator('.toast, .alert')).toContainText(/submitted successfully|redirecting/i);
  });

  test('should prevent duplicate email submission', async ({ page }) => {
    await page.goto('/account-request');
    
    // Try to submit with the same email again
    await page.fill('input[name="full_name"]', 'Another User');
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="account_type"]', 'user');
    await page.fill('textarea[name="reason"]', 'Attempting duplicate submission');
    
    await page.click('button[type="submit"]');
    
    // Should see error about existing request
    await expect(page.locator('.toast, .alert, .error')).toContainText(/already exists|duplicate/i);
  });

  test('should enforce rate limits after multiple attempts', async ({ page }) => {
    const uniqueEmails = [
      `rate-test-1-${Date.now()}@example.com`,
      `rate-test-2-${Date.now()}@example.com`,
      `rate-test-3-${Date.now()}@example.com`,
    ];

    // Make multiple requests quickly
    for (let i = 0; i < uniqueEmails.length; i++) {
      await page.goto('/account-request');
      
      await page.fill('input[name="full_name"]', `Rate Test User ${i + 1}`);
      await page.fill('input[name="email"]', uniqueEmails[i]);
      await page.selectOption('select[name="account_type"]', 'user');
      await page.fill('textarea[name="reason"]', `Rate limit test ${i + 1}`);
      
      await page.click('button[type="submit"]');
      
      if (i < 2) {
        // First few should succeed
        await expect(page.locator('.toast, .alert')).toContainText(/submitted|success/i);
      } else {
        // Later ones should be rate limited
        await expect(page.locator('.toast, .alert, .error')).toContainText(/rate limit|too many|wait/i);
      }
      
      // Small delay between attempts
      await page.waitForTimeout(1000);
    }
  });
});
