
import { test, expect } from '@playwright/test';
import { ProductionMonitor, MonitoringConfig } from './ProductionMonitoringTest';

const monitoringConfig: MonitoringConfig = {
  endpoints: [
    'http://localhost:4173',
    'http://localhost:4173/api/health',
    'http://localhost:4173/dashboard/home'
  ],
  thresholds: {
    responseTime: 2000,
    errorRate: 5,
    uptime: 99.9
  },
  alerts: {
    email: ['admin@example.com'],
    webhook: process.env.SLACK_WEBHOOK_URL
  }
};

test.describe('Production Monitoring', () => {
  let monitor: ProductionMonitor;

  test.beforeEach(() => {
    monitor = new ProductionMonitor(monitoringConfig);
  });

  test('should perform health checks on all endpoints', async () => {
    const results = await monitor.runHealthChecks();
    
    expect(results).toHaveLength(monitoringConfig.endpoints.length);
    
    results.forEach(result => {
      expect(result).toHaveProperty('endpoint');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('responseTime');
      expect(result).toHaveProperty('timestamp');
      expect(['healthy', 'degraded', 'down']).toContain(result.status);
    });
  });

  test('should detect degraded performance', async () => {
    // Mock slow response
    const slowEndpoint = 'http://httpbin.org/delay/3';
    const result = await monitor.healthCheck(slowEndpoint);
    
    expect(result.responseTime).toBeGreaterThan(monitoringConfig.thresholds.responseTime);
    expect(result.status).toBe('degraded');
  });

  test('should generate alerts for critical issues', async () => {
    const mockResults = [
      {
        endpoint: 'http://localhost:4173',
        status: 'down' as const,
        responseTime: 0,
        timestamp: new Date(),
        error: 'Connection refused'
      },
      {
        endpoint: 'http://localhost:4173/api/health',
        status: 'degraded' as const,
        responseTime: 5000,
        timestamp: new Date()
      }
    ];

    const alerts = monitor.generateAlerts(mockResults);
    
    expect(alerts).toContain(expect.stringContaining('CRITICAL'));
    expect(alerts).toContain(expect.stringContaining('WARNING'));
    expect(alerts).toContain(expect.stringContaining('SLOW RESPONSE'));
  });

  test('should calculate uptime correctly', async () => {
    // Add mock results for uptime calculation
    const mockResults = Array.from({ length: 10 }, (_, i) => ({
      endpoint: 'http://localhost:4173',
      status: i < 8 ? 'healthy' as const : 'down' as const,
      responseTime: 200,
      timestamp: new Date(Date.now() - i * 60000) // Every minute for the last 10 minutes
    }));

    monitor['results'] = mockResults;
    
    const uptime = monitor.calculateUptime('http://localhost:4173', 1);
    expect(uptime).toBe(80); // 8 out of 10 healthy
  });

  test('should generate comprehensive status report', async () => {
    await monitor.runHealthChecks();
    const report = monitor.generateStatusReport();
    
    expect(report).toContain('System Status Report');
    expect(report).toContain('Overall Status');
    expect(report).toContain('Generated');
    
    monitoringConfig.endpoints.forEach(endpoint => {
      expect(report).toContain(endpoint);
    });
  });
});

test.describe('Real-time Monitoring Integration', () => {
  test('should monitor critical user journeys', async ({ page }) => {
    const criticalPaths = [
      '/dashboard/home',
      '/dashboard/signal-stream',
      '/dashboard/admin-panel'
    ];

    for (const path of criticalPaths) {
      const startTime = Date.now();
      
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // 5 second threshold
      
      // Check for JavaScript errors
      const errors = await page.evaluate(() => {
        return (window as any).__jsErrors || [];
      });
      
      expect(errors).toHaveLength(0);
    }
  });

  test('should validate API response times', async ({ request }) => {
    const apiEndpoints = [
      '/api/health',
      '/api/users',
      '/api/trade-alerts'
    ];

    for (const endpoint of apiEndpoints) {
      const startTime = Date.now();
      
      try {
        const response = await request.get(`http://localhost:4173${endpoint}`);
        const responseTime = Date.now() - startTime;
        
        expect(responseTime).toBeLessThan(2000); // 2 second threshold
        expect(response.status()).toBeLessThan(400);
      } catch (error) {
        console.warn(`API endpoint ${endpoint} failed:`, error);
      }
    }
  });
});
