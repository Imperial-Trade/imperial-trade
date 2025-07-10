
import { test, expect } from '@playwright/test';

test.describe('Complete User Journey - E2E Tests', () => {
  test('complete new user onboarding and trading workflow', async ({ page }) => {
    // 1. Registration Flow
    await page.goto('/signin');
    await page.click('text=Sign Up');
    
    await page.fill('input[type="email"]', 'newtrader@test.com');
    await page.fill('input[type="password"]', 'SecurePassword123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
    await page.fill('input[name="fullName"]', 'New Trader');
    
    await page.click('button[type="submit"]');
    
    // Verify email confirmation message
    await expect(page.locator('text=Check your email')).toBeVisible();
    
    // Simulate email confirmation (in real test, would need to handle email)
    // For now, proceed to login
    await page.goto('/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 2. Dashboard Onboarding
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();
    
    // Complete onboarding steps if present
    const onboardingModal = page.locator('[data-testid="onboarding-modal"]');
    if (await onboardingModal.isVisible()) {
      await page.click('button:has-text("Get Started")');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Finish")');
    }
    
    // 3. Profile Setup
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Profile');
    
    await page.fill('input[name="displayName"]', 'Pro Trader');
    await page.fill('textarea[name="bio"]', 'Experienced forex trader');
    await page.click('button:has-text("Save Profile")');
    
    await expect(page.locator('text=Profile updated')).toBeVisible();
    
    // 4. First Trade Signal Creation
    await page.goto('/dashboard/new-signal');
    
    await page.fill('input[name="assetName"]', 'EUR/USD');
    await page.fill('input[name="finnhubSymbol"]', 'OANDA:EUR_USD');
    await page.selectOption('select[name="tradeType"]', 'BUY');
    await page.fill('input[name="entryPrice"]', '1.0500');
    await page.fill('input[name="stopLoss"]', '1.0450');
    await page.fill('input[name="tp1"]', '1.0550');
    await page.fill('textarea[name="notes"]', 'Strong bullish momentum expected');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Signal created successfully')).toBeVisible();
    
    // 5. View Signal Stream
    await page.goto('/dashboard/signal-stream');
    
    await expect(page.locator('[data-testid="signal-card"]')).toBeVisible();
    await expect(page.locator('text=EUR/USD')).toBeVisible();
    
    // 6. Trading Journal Entry
    await page.goto('/dashboard/my-progress');
    await page.click('text=Trading Journal');
    
    await page.click('button:has-text("Add Entry")');
    
    await page.fill('input[name="assetTicker"]', 'EURUSD');
    await page.selectOption('select[name="tradeType"]', 'BUY');
    await page.fill('input[name="entryPrice"]', '1.0500');
    await page.fill('input[name="exitPrice"]', '1.0550');
    await page.fill('input[name="positionSize"]', '10000');
    await page.fill('input[name="pnl"]', '50');
    await page.fill('textarea[name="notes"]', 'Successful trade following signal');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Journal entry added')).toBeVisible();
    
    // 7. Educational Content Engagement
    await page.goto('/dashboard/education');
    
    const firstVideo = page.locator('[data-testid="video-card"]').first();
    await firstVideo.click();
    
    // Simulate watching video
    await page.waitForTimeout(2000);
    
    // Take quiz if available
    const quizButton = page.locator('button:has-text("Take Quiz")');
    if (await quizButton.isVisible()) {
      await quizButton.click();
      
      // Answer first question
      await page.click('input[type="radio"][value="option1"]');
      await page.click('button:has-text("Next")');
      
      // Complete quiz
      await page.click('button:has-text("Submit")');
      
      await expect(page.locator('text=Quiz completed')).toBeVisible();
    }
  });

  test('advanced user workflow - strategy development', async ({ page }) => {
    // Login as experienced user
    await page.goto('/signin');
    await page.fill('input[type="email"]', 'advanced@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 1. Create Trading Strategy
    await page.goto('/dashboard/advanced-tools');
    await page.click('text=Strategy Builder');
    
    await page.fill('input[name="strategyName"]', 'Moving Average Crossover');
    await page.fill('textarea[name="description"]', 'EMA crossover strategy with RSI filter');
    
    // Add strategy rules
    await page.click('button:has-text("Add Rule")');
    await page.selectOption('select[name="indicator"]', 'EMA');
    await page.fill('input[name="period"]', '20');
    await page.selectOption('select[name="condition"]', 'crosses_above');
    
    await page.click('button:has-text("Save Strategy")');
    
    await expect(page.locator('text=Strategy saved')).toBeVisible();
    
    // 2. Backtest Strategy
    await page.click('button:has-text("Backtest")');
    
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-06-01');
    await page.selectOption('select[name="symbol"]', 'EURUSD');
    
    await page.click('button:has-text("Run Backtest")');
    
    // Wait for backtest results
    await expect(page.locator('[data-testid="backtest-results"]')).toBeVisible({ timeout: 10000 });
    
    // 3. Risk Simulation
    await page.goto('/dashboard/advanced-tools');
    await page.click('text=Risk Simulator');
    
    await page.fill('input[name="instrument"]', 'EURUSD');
    await page.fill('input[name="entryPrice"]', '1.0500');
    await page.fill('input[name="stopLoss"]', '1.0450');
    await page.fill('input[name="takeProfit"]', '1.0600');
    await page.fill('input[name="positionSize"]', '10000');
    
    await page.click('button:has-text("Run Simulation")');
    
    await expect(page.locator('[data-testid="risk-analysis"]')).toBeVisible();
    
    // 4. Share Strategy
    await page.goto('/dashboard/forum');
    await page.click('button:has-text("New Post")');
    
    await page.fill('input[name="title"]', 'New EMA Crossover Strategy');
    await page.selectOption('select[name="category"]', 'strategy');
    await page.fill('textarea[name="content"]', 'Sharing my latest strategy with the community...');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Post created')).toBeVisible();
  });
});
