
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { TestWrapper } from '@/test/utils/test-helpers';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import { EnhancedSystemMonitoring } from '@/components/admin/EnhancedSystemMonitoring';
import LivePriceWidget from '@/components/signals/LivePriceWidget';
import { TestDataFactory } from '@/__tests__/utils/testDataFactory';

describe('Component Performance Tests', () => {
  let memoryBefore: number;
  let performanceStart: number;

  beforeEach(() => {
    // Clear memory and start performance monitoring
    if (global.gc) {
      global.gc();
    }
    memoryBefore = process.memoryUsage().heapUsed;
    performanceStart = performance.now();
  });

  afterEach(() => {
    const performanceEnd = performance.now();
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryDiff = memoryAfter - memoryBefore;
    const timeDiff = performanceEnd - performanceStart;
    
    console.log(`Performance metrics - Time: ${timeDiff.toFixed(2)}ms, Memory: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);
  });

  describe('TradeAlertCard Performance', () => {
    it('should render within performance threshold', () => {
      const mockAlert = TestDataFactory.createMockTradeAlertData();
      const mockProps = {
        alert: mockAlert,
        currentUserId: 'test-user-id',
        onStatusUpdate: vi.fn(),
        onTakeProfitHit: vi.fn(),
        onStopLossHit: vi.fn(),
        onOrderActivation: vi.fn(),
        isAdmin: false,
        isCreator: false,
        livePrice: 1.0525,
        connectionStatus: 'connected' as const,
        priceSource: 'WebSocket',
        isRecentClosure: false
      };

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <TradeAlertCard {...mockProps} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Assert render time is under 100ms
      expect(renderTime).toBeLessThan(100);
      expect(screen.getByText(mockAlert.asset_name)).toBeInTheDocument();
    });

    it('should handle rapid prop updates efficiently', () => {
      const mockAlert = TestDataFactory.createMockTradeAlertData();
      const mockProps = {
        alert: mockAlert,
        currentUserId: 'test-user-id',
        onStatusUpdate: vi.fn(),
        onTakeProfitHit: vi.fn(),
        onStopLossHit: vi.fn(),
        onOrderActivation: vi.fn(),
        isAdmin: false,
        isCreator: false,
        livePrice: 1.0500,
        connectionStatus: 'connected' as const,
        priceSource: 'WebSocket',
        isRecentClosure: false
      };

      const { rerender } = render(
        <TestWrapper>
          <TradeAlertCard {...mockProps} />
        </TestWrapper>
      );

      const startTime = performance.now();

      // Simulate rapid price updates
      for (let i = 0; i < 50; i++) {
        rerender(
          <TestWrapper>
            <TradeAlertCard 
              {...mockProps} 
              livePrice={1.0500 + (i * 0.0001)} 
            />
          </TestWrapper>
        );
      }

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      // Assert 50 updates complete under 500ms
      expect(updateTime).toBeLessThan(500);
    });
  });

  describe('System Monitoring Performance', () => {
    it('should render monitoring dashboard efficiently', () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <EnhancedSystemMonitoring />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Complex dashboard should render under 200ms
      expect(renderTime).toBeLessThan(200);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory with LivePriceWidget', () => {
      const mockAlert = TestDataFactory.createMockTradeAlertData();
      const mockProps = {
        alert: mockAlert,
        currentUserId: 'test-user-id',
        onTakeProfitHit: vi.fn(),
        onStopLossHit: vi.fn(),
        onOrderActivation: vi.fn(),
        livePrice: 1.0525,
        connectionStatus: 'connected' as const,
        priceSource: 'WebSocket'
      };

      const initialMemory = process.memoryUsage().heapUsed;

      // Render and unmount component multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <TestWrapper>
            <LivePriceWidget {...mockProps} />
          </TestWrapper>
        );
        unmount();
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be minimal (less than 5MB)
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);
    });
  });
});
