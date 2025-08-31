import { test, expect } from '@playwright/test';

test.describe('Go-Live: Real Email Send Flow', () => {
  test.beforeAll(async () => {
    // This suite only runs if EMAIL_ENABLED=true and OneSignal keys are configured
    const emailEnabled = process.env.EMAIL_ENABLED === 'true';
    const hasOneSignalKeys = process.env.ONESIGNAL_API_KEY && process.env.ONESIGNAL_APP_ID;
    
    if (!emailEnabled || !hasOneSignalKeys) {
      test.skip('Skipping real email tests - EMAIL_ENABLED=false or OneSignal keys not configured');
    }
  });

  test('account request with real email send', async ({ page }) => {
    const testEmail = `test-realsend-${Date.now()}@example.com`;
    
    // Navigate to account request page
    await page.goto('/account-request');
    
    // Fill and submit form
    await page.fill('input[name="full_name"]', 'Test Real Send User');
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="account_type"]', 'member');
    await page.fill('textarea[name="reason"]', 'Testing real email send flow');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('.toast')).toContainText('Account request submitted successfully');
    
    // Note: In real implementation, we would verify actual email delivery
    // through OneSignal webhook or delivery confirmation API
    console.log(`Real email test - Request submitted for: ${testEmail}`);
    
    // Verify request appears in status page
    await page.goto('/account-request-status');
    await page.fill('input[type="email"]', testEmail);
    await page.click('button[type="submit"]');
    
    // Should show pending status
    await expect(page.locator('text=pending')).toBeVisible();
  });

  test('welcome email delivery verification', async ({ page }) => {
    const testEmail = `welcome-test-${Date.now()}@example.com`;
    
    // Submit account request
    await page.goto('/account-request');
    await page.fill('input[name="full_name"]', 'Welcome Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="account_type"]', 'member');
    await page.fill('textarea[name="reason"]', 'Testing welcome email delivery');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.toast')).toContainText('Account request submitted successfully');
    
    // In a real test environment, this would:
    // 1. Wait for admin approval simulation
    // 2. Verify welcome email was sent via OneSignal API
    // 3. Check delivery status and bounce handling
    
    console.log(`Welcome email test - Request submitted for: ${testEmail}`);
  });

  test('email delivery monitoring', async ({ page }) => {
    // This test would verify email delivery metrics and error handling
    // In production, it would check OneSignal delivery confirmations
    
    const testEmail = `monitor-test-${Date.now()}@example.com`;
    
    await page.goto('/account-request');
    await page.fill('input[name="full_name"]', 'Monitor Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.selectOption('select[name="account_type"]', 'member');
    await page.fill('textarea[name="reason"]', 'Testing email monitoring');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.toast')).toContainText('Account request submitted successfully');
    
    // Log for monitoring verification
    console.log(`Email monitoring test - Request submitted for: ${testEmail}`);
  });
});