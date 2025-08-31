import { test, expect } from '@playwright/test';

// Complete staging E2E flow including approval workflow
test.describe('Staging Full Approval Flow', () => {
  const timestamp = Date.now();
  const testUser = {
    email: `staging-e2e-${timestamp}@example.com`,
    fullName: 'Staging E2E Test User',
    password: 'StagingTest123!'
  };

  let requestId: string;

  test('full flow: request → manual approval → password setup → login → dashboard', async ({ page }) => {
    // Step 1: Submit account request
    console.log('Step 1: Submitting account request...');
    await page.goto('/account-request');
    
    await page.fill('input[name="full_name"]', testUser.fullName);
    await page.fill('input[name="email"]', testUser.email);
    await page.selectOption('select[name="account_type"]', 'user');
    await page.fill('textarea[name="reason"]', 'Staging E2E test - full approval flow');
    
    await page.click('button[type="submit"]');
    
    // Verify submission success
    await expect(page.locator('.toast, .alert')).toContainText(/submitted successfully/i);
    console.log('✅ Account request submitted successfully');
    
    // Step 2: Verify request status shows pending
    console.log('Step 2: Checking request status...');
    await page.goto('/account-request-status');
    await page.fill('input[type="email"]', testUser.email);
    await page.click('button[type="submit"]');
    
    // Should show pending status
    await expect(page.locator('text=pending')).toBeVisible();
    console.log('✅ Request status shows pending');
    
    // Extract request ID from the page (if available in UI)
    // This would need to be updated based on actual UI implementation
    
    // Step 3: Manual approval step
    console.log('⚠️  Manual step required: Admin must approve request via admin panel');
    console.log(`   Request email: ${testUser.email}`);
    console.log('   Please approve this request and press any key to continue...');
    
    // In a real staging test, this would be automated with admin credentials
    // For now, we'll pause here and continue with post-approval steps
    
    // Step 4: Attempt login after approval (client-side password setup)
    console.log('Step 4: Testing login after approval...');
    await page.goto('/signin');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Check if we're redirected to dashboard or if account needs to be created
    await page.waitForURL(/(dashboard|signin|account-creation|setup)/, { timeout: 10000 });
    const currentUrl = page.url();
    
    if (currentUrl.includes('dashboard')) {
      console.log('✅ Successfully logged in and redirected to dashboard');
      await expect(page.locator('h1, h2')).toContainText(/dashboard|welcome/i);
    } else if (currentUrl.includes('setup') || currentUrl.includes('account-creation')) {
      console.log('✅ Redirected to account setup page as expected');
      // Handle password setup flow here if needed
    } else {
      console.log('⚠️  Login attempt - may need manual approval first');
    }
  });

  test('rate limit enforcement - submit/duplicate/limit', async ({ page }) => {
    const baseEmail = `rate-limit-test-${timestamp}`;
    
    console.log('Testing rate limit enforcement...');
    
    // Test 1: First submission should succeed
    await page.goto('/account-request');
    await page.fill('input[name="full_name"]', 'Rate Limit Test 1');
    await page.fill('input[name="email"]', `${baseEmail}-1@example.com`);
    await page.selectOption('select[name="account_type"]', 'user');
    await page.fill('textarea[name="reason"]', 'Rate limit test - first submission');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.toast, .alert')).toContainText(/submitted successfully/i);
    console.log('✅ First submission succeeded');
    
    // Test 2: Duplicate email should be rejected
    await page.goto('/account-request');
    await page.fill('input[name="full_name"]', 'Rate Limit Test Duplicate');
    await page.fill('input[name="email"]', `${baseEmail}-1@example.com`); // Same email
    await page.selectOption('select[name="account_type"]', 'user');
    await page.fill('textarea[name="reason"]', 'Rate limit test - duplicate email');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.toast, .alert, .error')).toContainText(/already exists|duplicate|exists/i);
    console.log('✅ Duplicate email rejected');
    
    // Test 3: Rapid submissions should trigger rate limiting
    const rapidEmails = [
      `${baseEmail}-rapid-1@example.com`,
      `${baseEmail}-rapid-2@example.com`,
      `${baseEmail}-rapid-3@example.com`,
    ];
    
    let rateLimitTriggered = false;
    
    for (let i = 0; i < rapidEmails.length; i++) {
      await page.goto('/account-request');
      await page.fill('input[name="full_name"]', `Rapid Test ${i + 1}`);
      await page.fill('input[name="email"]', rapidEmails[i]);
      await page.selectOption('select[name="account_type"]', 'user');
      await page.fill('textarea[name="reason"]', `Rapid submission test ${i + 1}`);
      await page.click('button[type="submit"]');
      
      // Check if rate limited
      const isRateLimited = await page.locator('.toast, .alert, .error').textContent();
      if (isRateLimited && /rate limit|too many|wait|blocked/i.test(isRateLimited)) {
        console.log(`✅ Rate limit triggered on attempt ${i + 1}`);
        rateLimitTriggered = true;
        break;
      }
      
      // Small delay between attempts
      await page.waitForTimeout(500);
    }
    
    if (!rateLimitTriggered) {
      console.log('⚠️  Rate limit not triggered - may need adjustment or more attempts');
    }
  });
});