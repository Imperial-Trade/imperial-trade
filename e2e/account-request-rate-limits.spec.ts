
import { test, expect } from '@playwright/test';

test.describe('Account Request Rate Limits', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  
  test('should allow anonymous users to submit account requests', async ({ page }) => {
    await page.goto('/account-request');
    
    // Ensure we're not logged in (should be anonymous)
    await expect(page.locator('body')).not.toContainText(/dashboard|logout|profile/i);
    
    // Fill out the form
    await page.fill('input[name="full_name"]', 'Anonymous Test User');
    await page.fill('input[name="email"]', `anonymous-${Date.now()}@example.com`);
    await page.selectOption('select[name="account_type"]', 'user');
    await page.fill('textarea[name="reason"]', 'Testing anonymous account request submission');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should see success message (not permission denied)
    await expect(page.locator('.toast, .alert')).toContainText(/submitted successfully|redirecting/i);
  });
  
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

  test('should enforce IP rate limits after 11 requests with unique emails', async ({ page }) => {
    const uniqueEmails = Array.from({ length: 11 }, (_, i) => 
      `ip-rate-test-${i + 1}-${Date.now()}@example.com`
    );

    // Make 11 requests quickly from same IP with different emails
    for (let i = 0; i < uniqueEmails.length; i++) {
      await page.goto('/account-request');
      
      await page.fill('input[name="full_name"]', `IP Rate Test User ${i + 1}`);
      await page.fill('input[name="email"]', uniqueEmails[i]);
      await page.selectOption('select[name="account_type"]', 'user');
      await page.fill('textarea[name="reason"]', `IP rate limit test ${i + 1}`);
      
      await page.click('button[type="submit"]');
      
      if (i < 10) {
        // First 10 should succeed (IP limit is 10/hour)
        await expect(page.locator('.toast, .alert')).toContainText(/submitted|success/i);
      } else {
        // 11th should be IP rate limited
        await expect(page.locator('.toast, .alert, .error')).toContainText(/too many requests from your location|rate limit/i);
      }
      
      // Small delay between attempts
      await page.waitForTimeout(500);
    }
  });
});
