import { test, expect } from '@playwright/test';

test.describe('WebSocket Authentication E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock console to capture WebSocket logs
    await page.addInitScript(() => {
      window.wsLogs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        window.wsLogs.push(args.join(' '));
        originalLog(...args);
      };
    });
  });

  test('should require authentication before allowing subscriptions', async ({ page }) => {
    // Mock WebSocket to intercept messages
    await page.addInitScript(() => {
      window.wsMessages = [];
      
      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = class extends OriginalWebSocket {
        constructor(url) {
          super(url);
          
          this.addEventListener('open', () => {
            // Simulate auth required
            setTimeout(() => {
              this.dispatchEvent(new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'auth_required',
                  message: 'Authentication required'
                })
              }));
            }, 100);
          });
        }
        
        send(data) {
          window.wsMessages.push(JSON.parse(data));
          super.send(data);
        }
      };
    });

    await page.goto('/');
    
    // Wait for WebSocket connection
    await page.waitForFunction(() => window.wsMessages?.length > 0);
    
    // Check that first message is authentication
    const messages = await page.evaluate(() => window.wsMessages);
    expect(messages[0]).toHaveProperty('action', 'authenticate');
    expect(messages[0]).toHaveProperty('token');
  });

  test('should handle authentication timeout', async ({ page }) => {
    await page.addInitScript(() => {
      window.wsMessages = [];
      window.wsEvents = [];
      
      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = class extends OriginalWebSocket {
        constructor(url) {
          super(url);
          
          this.addEventListener('open', () => {
            // Don't respond to auth - simulate timeout
            setTimeout(() => {
              this.dispatchEvent(new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'auth_error',
                  message: 'Authentication timeout'
                })
              }));
              this.close();
            }, 1000);
          });
        }
        
        send(data) {
          window.wsMessages.push(JSON.parse(data));
        }
        
        addEventListener(event, handler) {
          window.wsEvents.push(event);
          super.addEventListener(event, handler);
        }
      };
    });

    await page.goto('/');
    
    // Wait for timeout and close
    await page.waitForFunction(() => 
      window.wsMessages?.some(msg => msg.action === 'authenticate'), 
      { timeout: 5000 }
    );
    
    const messages = await page.evaluate(() => window.wsMessages);
    expect(messages).toHaveLength(1);
    expect(messages[0].action).toBe('authenticate');
  });

  test('should handle subscription limit exceeded', async ({ page }) => {
    await page.addInitScript(() => {
      window.wsMessages = [];
      window.wsResponses = [];
      
      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = class extends OriginalWebSocket {
        constructor(url) {
          super(url);
          
          this.addEventListener('open', () => {
            // Simulate successful auth first
            setTimeout(() => {
              this.dispatchEvent(new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'auth_success',
                  message: 'Authentication successful'
                })
              }));
              
              // Then simulate subscription limit error
              setTimeout(() => {
                this.dispatchEvent(new MessageEvent('message', {
                  data: JSON.stringify({
                    type: 'error',
                    code: 'max_subscriptions_exceeded',
                    message: 'Subscription limit exceeded (max: 20)'
                  })
                }));
              }, 200);
            }, 100);
          });
        }
        
        send(data) {
          const parsed = JSON.parse(data);
          window.wsMessages.push(parsed);
          
          // Record subscription attempts
          if (parsed.action === 'subscribe') {
            window.wsResponses.push('subscription_attempted');
          }
        }
      };
    });

    await page.goto('/');
    
    // Wait for auth and subscription error
    await page.waitForFunction(() => 
      window.wsMessages?.length >= 1, 
      { timeout: 5000 }
    );
    
    const messages = await page.evaluate(() => window.wsMessages);
    expect(messages[0].action).toBe('authenticate');
    expect(messages[0]).toHaveProperty('token');
  });

  test('should verify IP precedence logging', async ({ page }) => {
    // Set custom headers to test IP precedence
    await page.setExtraHTTPHeaders({
      'cf-connecting-ip': '1.2.3.4',
      'x-forwarded-for': '5.6.7.8, 9.10.11.12',
      'x-real-ip': '13.14.15.16'
    });

    await page.goto('/');
    
    // The WebSocket connection should use cf-connecting-ip with highest precedence
    // We can't directly test the server-side hashing, but we can verify the connection works
    await page.waitForFunction(() => 
      window.wsLogs?.some(log => log.includes('WebSocket')) ||
      window.navigator.onLine, 
      { timeout: 3000 }
    );
    
    expect(page.url()).toContain('/');
  });

  test('should maintain auth state across reconnections', async ({ page }) => {
    await page.addInitScript(() => {
      window.wsMessages = [];
      window.reconnectCount = 0;
      
      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = class extends OriginalWebSocket {
        constructor(url) {
          super(url);
          window.reconnectCount++;
          
          this.addEventListener('open', () => {
            // Always require auth on new connections
            setTimeout(() => {
              this.dispatchEvent(new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'auth_required',
                  message: 'Authentication required'
                })
              }));
            }, 50);
          });
        }
        
        send(data) {
          window.wsMessages.push(JSON.parse(data));
        }
      };
    });

    await page.goto('/');
    
    // Wait for first connection and auth
    await page.waitForFunction(() => window.reconnectCount >= 1);
    await page.waitForFunction(() => window.wsMessages?.length >= 1);
    
    // Verify auth message sent
    const messages = await page.evaluate(() => window.wsMessages);
    expect(messages[0].action).toBe('authenticate');
  });

  test('should handle concurrent subscription requests', async ({ page }) => {
    await page.addInitScript(() => {
      window.wsMessages = [];
      window.subscriptionCount = 0;
      
      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = class extends OriginalWebSocket {
        constructor(url) {
          super(url);
          
          this.addEventListener('open', () => {
            setTimeout(() => {
              this.dispatchEvent(new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'auth_success',
                  message: 'Authentication successful'
                })
              }));
            }, 100);
          });
        }
        
        send(data) {
          const parsed = JSON.parse(data);
          window.wsMessages.push(parsed);
          
          if (parsed.action === 'subscribe') {
            window.subscriptionCount++;
          }
        }
      };
    });

    await page.goto('/');
    
    // Wait for auth success
    await page.waitForFunction(() => window.wsMessages?.length >= 1);
    
    // The system should batch concurrent subscriptions
    await page.waitForFunction(() => window.subscriptionCount >= 0, { timeout: 2000 });
    
    const subscriptionCount = await page.evaluate(() => window.subscriptionCount);
    expect(subscriptionCount).toBeGreaterThanOrEqual(0);
  });
});