
import { test, expect, Page } from '@playwright/test';

const CONCURRENT_USERS = 5;
const TEST_DURATION = 30000; // 30 seconds

test.describe('Load Testing - Critical User Flows', () => {
  test('should handle multiple concurrent login attempts', async ({ browser }) => {
    const contexts = await Promise.all(
      Array.from({ length: CONCURRENT_USERS }, () => browser.newContext())
    );
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    const startTime = Date.now();
    
    // Simulate concurrent login attempts
    const loginPromises = pages.map(async (page, index) => {
      await page.goto('/signin');
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', `testuser${index}@example.com`);
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      
      const loginStart = Date.now();
      await page.click('[data-testid="login-button"]');
      
      // Wait for either success or error
      try {
        await page.waitForURL('/dashboard', { timeout: 10000 });
        return { success: true, time: Date.now() - loginStart, user: index };
      } catch {
        return { success: false, time: Date.now() - loginStart, user: index };
      }
    });

    const results = await Promise.all(loginPromises);
    const totalTime = Date.now() - startTime;

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));

    // Performance assertions
    expect(totalTime).toBeLessThan(15000); // All logins complete under 15s
    
    const successfulLogins = results.filter(r => r.success);
    const averageLoginTime = successfulLogins.reduce((sum, r) => sum + r.time, 0) / successfulLogins.length;
    
    expect(averageLoginTime).toBeLessThan(3000); // Average login time under 3s
    
    console.log(`Load Test Results: ${successfulLogins.length}/${CONCURRENT_USERS} successful logins, avg time: ${averageLoginTime.toFixed(2)}ms`);
  });

  test('should handle concurrent signal creation', async ({ browser }) => {
    // Create authenticated contexts
    const contexts = await Promise.all(
      Array.from({ length: CONCURRENT_USERS }, () => browser.newContext())
    );
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Authenticate all users first (mock or use test accounts)
    await Promise.all(pages.map(async (page, index) => {
      await page.goto('/dashboard/new-signal');
      // Assume authentication is handled by test setup
    }));

    const startTime = Date.now();
    
    // Simulate concurrent signal creation
    const signalPromises = pages.map(async (page, index) => {
      const signalStart = Date.now();
      
      try {
        // Fill signal form
        await page.fill('[data-testid="asset-name-input"]', `EUR/USD-${index}`);
        await page.selectOption('[data-testid="trade-type-select"]', 'buy');
        await page.fill('[data-testid="entry-price-input"]', '1.0500');
        await page.fill('[data-testid="stop-loss-input"]', '1.0450');
        await page.fill('[data-testid="tp1-input"]', '1.0550');
        
        await page.click('[data-testid="create-signal-button"]');
        
        // Wait for success indication
        await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
        
        return { success: true, time: Date.now() - signalStart, user: index };
      } catch (error) {
        return { success: false, time: Date.now() - signalStart, user: index, error: error.message };
      }
    });

    const results = await Promise.all(signalPromises);
    const totalTime = Date.now() - startTime;

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));

    // Performance assertions
    expect(totalTime).toBeLessThan(20000); // All signals created under 20s
    
    const successfulSignals = results.filter(r => r.success);
    expect(successfulSignals.length).toBeGreaterThanOrEqual(CONCURRENT_USERS * 0.8); // 80% success rate
    
    const averageCreationTime = successfulSignals.reduce((sum, r) => sum + r.time, 0) / successfulSignals.length;
    expect(averageCreationTime).toBeLessThan(5000); // Average creation time under 5s
    
    console.log(`Signal Creation Load Test: ${successfulSignals.length}/${CONCURRENT_USERS} successful, avg time: ${averageCreationTime.toFixed(2)}ms`);
  });

  test('should handle sustained WebSocket connections', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Monitor WebSocket connections
    const wsMessages: any[] = [];
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        wsMessages.push({ 
          timestamp: Date.now(), 
          data: event.payload,
          type: 'received'
        });
      });
      
      ws.on('framesent', event => {
        wsMessages.push({ 
          timestamp: Date.now(), 
          data: event.payload,
          type: 'sent'
        });
      });
    });

    await page.goto('/dashboard/live');
    
    // Wait for WebSocket connection
    await page.waitForTimeout(2000);
    
    const testStart = Date.now();
    let messageCount = 0;
    
    // Monitor for sustained period
    while (Date.now() - testStart < TEST_DURATION) {
      await page.waitForTimeout(1000);
      const currentMessages = wsMessages.filter(m => m.timestamp > testStart).length;
      
      if (currentMessages > messageCount) {
        messageCount = currentMessages;
      }
      
      // Check if page is still responsive
      const title = await page.title();
      expect(title).toBeTruthy();
    }
    
    await context.close();
    
    // Performance assertions
    expect(messageCount).toBeGreaterThan(0); // Should receive messages
    
    const messagesPerSecond = messageCount / (TEST_DURATION / 1000);
    console.log(`WebSocket Load Test: ${messageCount} messages over ${TEST_DURATION/1000}s (${messagesPerSecond.toFixed(2)} msg/s)`);
    
    // Should handle reasonable message rate without issues
    expect(messagesPerSecond).toBeLessThan(100); // Reasonable upper bound
  });

  test('should handle concurrent admin operations', async ({ browser }) => {
    const contexts = await Promise.all(
      Array.from({ length: 3 }, () => browser.newContext()) // Fewer concurrent admin users
    );
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    // Navigate to admin panel
    await Promise.all(pages.map(page => page.goto('/dashboard/admin')));
    
    const startTime = Date.now();
    
    // Simulate concurrent admin operations
    const adminPromises = pages.map(async (page, index) => {
      const operationStart = Date.now();
      
      try {
        // Navigate to user management
        await page.click('[data-testid="user-management-tab"]');
        
        // Wait for user list to load
        await page.waitForSelector('[data-testid="user-table"]', { timeout: 10000 });
        
        // Perform admin action (view user details)
        const userRows = await page.$$('[data-testid="user-row"]');
        if (userRows.length > 0) {
          await userRows[0].click();
        }
        
        return { success: true, time: Date.now() - operationStart, admin: index };
      } catch (error) {
        return { success: false, time: Date.now() - operationStart, admin: index, error: error.message };
      }
    });

    const results = await Promise.all(adminPromises);
    const totalTime = Date.now() - startTime;

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));

    // Performance assertions
    const successfulOperations = results.filter(r => r.success);
    expect(successfulOperations.length).toBeGreaterThanOrEqual(2); // At least 2/3 success
    
    const averageOperationTime = successfulOperations.reduce((sum, r) => sum + r.time, 0) / successfulOperations.length;
    expect(averageOperationTime).toBeLessThan(8000); // Average operation time under 8s
    
    console.log(`Admin Load Test: ${successfulOperations.length}/3 successful operations, avg time: ${averageOperationTime.toFixed(2)}ms`);
  });
});
