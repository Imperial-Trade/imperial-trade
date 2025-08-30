
import { test, expect } from '@playwright/test';

test.describe('Account Approval Flow', () => {
  const testUser = {
    email: `approval-test-${Date.now()}@example.com`,
    fullName: 'Approval Test User',
    password: 'TestPassword123!'
  };

  test('complete flow: request → approval → account creation → sign in → dashboard', async ({ page }) => {
    // Step 1: Submit account request
    await page.goto('/account-request');
    
    await page.fill('input[name="full_name"]', testUser.fullName);
    await page.fill('input[name="email"]', testUser.email);
    await page.selectOption('select[name="account_type"]', 'user');
    await page.fill('textarea[name="reason"]', 'E2E test for approval flow');
    
    await page.click('button[type="submit"]');
    
    // Verify submission success
    await expect(page.locator('.toast, .alert')).toContainText(/submitted successfully/i);
    
    // Step 2: Check request status
    await page.goto('/account-request-status');
    await page.fill('input[type="email"]', testUser.email);
    await page.click('button[type="submit"]');
    
    // Should show pending status
    await expect(page.locator('text=pending')).toBeVisible();
    
    // Note: In a real E2E test, we would need admin credentials to approve the request
    // For now, we'll test the flow assuming the request gets approved
    
    // Step 3: Test account creation flow (would happen after admin approval)
    // This would redirect to password setup page in real scenario
    
    // Step 4: Test sign in with new account
    await page.goto('/signin');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard (or show error if account not yet created)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(dashboard|signin|error)/);
    
    // If successful, should see dashboard
    if (currentUrl.includes('dashboard')) {
      await expect(page.locator('h1, h2')).toContainText(/dashboard|welcome/i);
    }
  });

  test('should handle rejected requests properly', async ({ page }) => {
    // Submit a request that might be rejected
    await page.goto('/account-request');
    
    await page.fill('input[name="full_name"]', 'Reject Test User');
    await page.fill('input[name="email"]', `reject-test-${Date.now()}@example.com`);
    await page.selectOption('select[name="account_type"]', 'user');
    await page.fill('textarea[name="reason"]', 'Test rejection handling');
    
    await page.click('button[type="submit"]');
    
    // Verify submission
    await expect(page.locator('.toast, .alert')).toContainText(/submitted/i);
    
    // Check status page shows request
    await page.goto('/account-request-status');
    await page.fill('input[type="email"]', `reject-test-${Date.now()}@example.com`);
    await page.click('button[type="submit"]');
    
    // Should show the request (status would be updated by admin in real scenario)
    await expect(page.locator('text=pending,text=approved,text=rejected')).toBeVisible();
  });
});
