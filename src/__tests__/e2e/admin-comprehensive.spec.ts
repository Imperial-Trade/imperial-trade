
import { test, expect } from '@playwright/test';

test.describe('Admin Panel - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication state
    await page.goto('/signin');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'adminpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('complete admin workflow - user management', async ({ page }) => {
    await page.goto('/dashboard/admin');
    
    // Verify admin panel loads
    await expect(page.locator('text=Admin Panel')).toBeVisible();
    
    // Navigate to Users tab
    await page.click('text=Users');
    await expect(page.locator('table')).toBeVisible();
    
    // Test user search functionality
    await page.fill('input[placeholder*="Search"]', 'test@example.com');
    await page.waitForTimeout(500); // Debounce
    
    // Test user role filtering
    await page.selectOption('select', 'admin');
    await page.waitForTimeout(500);
    
    // Test user creation flow
    const createButton = page.locator('button:has-text("Create User")');
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Fill out user creation form
      await page.fill('input[name="email"]', 'newuser@test.com');
      await page.fill('input[name="display_name"]', 'New Test User');
      await page.selectOption('select[name="role"]', 'user');
      
      await page.click('button[type="submit"]');
      
      // Verify success message
      await expect(page.locator('text=User created successfully')).toBeVisible();
    }
    
    // Test user actions (role change, etc.)
    const firstUserRow = page.locator('table tbody tr').first();
    if (await firstUserRow.isVisible()) {
      const roleSelect = firstUserRow.locator('select');
      await roleSelect.selectOption('moderator');
      
      // Verify role update
      await expect(page.locator('text=User updated successfully')).toBeVisible();
    }
  });

  test('admin system monitoring and alerts', async ({ page }) => {
    await page.goto('/dashboard/admin');
    
    // Navigate to System tab
    await page.click('text=System');
    
    // Verify system metrics are displayed
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Active Users')).toBeVisible();
    await expect(page.locator('text=System Health')).toBeVisible();
    
    // Test system alerts
    await page.click('text=Alerts');
    
    // Verify alerts panel
    await expect(page.locator('[data-testid="alerts-panel"]')).toBeVisible();
    
    // Test alert creation if available
    const createAlertBtn = page.locator('button:has-text("Create Alert")');
    if (await createAlertBtn.isVisible()) {
      await createAlertBtn.click();
      
      await page.fill('input[name="title"]', 'Test System Alert');
      await page.fill('textarea[name="description"]', 'Test alert description');
      await page.selectOption('select[name="severity"]', 'medium');
      
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Alert created successfully')).toBeVisible();
    }
  });

  test('admin audit log functionality', async ({ page }) => {
    await page.goto('/dashboard/admin');
    
    // Navigate to Audit tab
    await page.click('text=Audit');
    
    // Verify audit log table
    await expect(page.locator('table')).toBeVisible();
    
    // Test audit log filtering
    await page.selectOption('select[name="action"]', 'user_created');
    await page.waitForTimeout(500);
    
    // Test date range filtering
    await page.fill('input[type="date"][name="startDate"]', '2024-01-01');
    await page.fill('input[type="date"][name="endDate"]', '2024-12-31');
    
    // Apply filters
    await page.click('button:has-text("Apply Filters")');
    
    // Verify filtered results
    await expect(page.locator('table tbody tr')).toBeVisible();
  });

  test('admin performance monitoring', async ({ page }) => {
    await page.goto('/dashboard/admin');
    
    // Navigate to Monitor tab
    await page.click('text=Monitor');
    
    // Verify performance charts
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
    
    // Test real-time monitoring toggle
    const realtimeToggle = page.locator('input[type="checkbox"]:has-text("Real-time")');
    if (await realtimeToggle.isVisible()) {
      await realtimeToggle.check();
      
      // Wait for real-time updates
      await page.waitForTimeout(2000);
      
      // Verify data updates
      await expect(page.locator('[data-testid="last-updated"]')).toBeVisible();
    }
    
    // Test metric thresholds
    const thresholdInput = page.locator('input[name="cpuThreshold"]');
    if (await thresholdInput.isVisible()) {
      await thresholdInput.fill('80');
      await page.click('button:has-text("Update Thresholds")');
      
      await expect(page.locator('text=Thresholds updated')).toBeVisible();
    }
  });
});
