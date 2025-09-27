import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import { LivePriceWidget } from '@/components/signals/LivePriceWidget';
import { transformTradeAlertToFrontend, DatabaseTradeAlert } from '@/utils/dataTransformers';

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@example.com' } })
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Component Performance Tests', () => {
  let mockAlert: import('@/utils/dataTransformers').TradeAlertWithProfile;
  let mockHandleTakeProfitHit: any;
  let mockHandleStopLossHit: any;
  let mockHandleOrderActivation: any;
  let mockHandleStatusUpdate: any;

  beforeEach(() => {
    mockAlert = {
      id: 'test-alert-1',
      userId: 'test-user',
      assetName: 'EUR/USD',
      tradermadeSymbol: 'EURUSD',
      tradeType: 'buy',
      entryPrice: 1.0850,
      stopLoss: 1.0800,
      tp1: 1.0900,
      tp2: 1.0950,
      status: 'active',
      tpHits: [],
      notes: 'Test signal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockHandleTakeProfitHit = vi.fn();
    mockHandleStopLossHit = vi.fn();
    mockHandleOrderActivation = vi.fn();
    mockHandleStatusUpdate = vi.fn();
  });

  describe('TradeAlertCard Performance', () => {
    it('should render within acceptable time limits', async () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <TradeAlertCard
            alert={mockAlert}
            onStatusUpdate={mockHandleStatusUpdate}
            onTakeProfitHit={mockHandleTakeProfitHit}
            onStopLossHit={mockHandleStopLossHit}
            onOrderActivation={mockHandleOrderActivation}
            livePrice={1.0875}
            connectionStatus="connected"
            priceSource="test"
            isAdmin={true}
            isCreator={true}
            isRecentClosure={false}
          />
        </TestWrapper>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100); // Should render in less than 100ms
    });

    it('should handle multiple rapid updates efficiently', async () => {
      const { rerender } = render(
        <TestWrapper>
          <TradeAlertCard
            alert={mockAlert}
            onStatusUpdate={mockHandleStatusUpdate}
            onTakeProfitHit={mockHandleTakeProfitHit}
            onStopLossHit={mockHandleStopLossHit}
            onOrderActivation={mockHandleOrderActivation}
            livePrice={1.0875}
            connectionStatus="connected"
            priceSource="test"
            isAdmin={true}
            isCreator={true}
            isRecentClosure={false}
          />
        </TestWrapper>
      );

      const startTime = performance.now();
      
      // Simulate rapid price updates
      for (let i = 0; i < 50; i++) {
        rerender(
          <TestWrapper>
            <TradeAlertCard
              alert={mockAlert}
              onStatusUpdate={mockHandleStatusUpdate}
              onTakeProfitHit={mockHandleTakeProfitHit}
              onStopLossHit={mockHandleStopLossHit}
              onOrderActivation={mockHandleOrderActivation}
              livePrice={1.0875 + (i * 0.0001)}
              connectionStatus="connected"
              priceSource="test"
              isAdmin={true}
              isCreator={true}
              isRecentClosure={false}
            />
          </TestWrapper>
        );
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(500); // 50 updates should complete within 500ms
    });
  });

  describe('LivePriceWidget Performance', () => {
    it('should not cause memory leaks during mount/unmount cycles', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Render and unmount component multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <TestWrapper>
            <LivePriceWidget 
              symbol="EURUSD"
              price={1.0875}
              className="test-widget"
              compact={true}
            />
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

    it('should render quickly with different props', () => {
      const testCases = [
        { symbol: 'EURUSD', price: 1.0875, compact: false },
        { symbol: 'GBPUSD', price: 1.2650, compact: true },
        { symbol: 'USDJPY', price: 150.25, compact: false },
      ];

      testCases.forEach((props) => {
        const startTime = performance.now();
        
        render(
          <TestWrapper>
            <LivePriceWidget {...props} className="performance-test" />
          </TestWrapper>
        );
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        expect(renderTime).toBeLessThan(50); // Each render should be under 50ms
      });
    });
  });

  describe('Component Integration Performance', () => {
    it('should handle complex component tree efficiently', () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <div>
            <TradeAlertCard
              alert={mockAlert}
              onStatusUpdate={mockHandleStatusUpdate}
              onTakeProfitHit={mockHandleTakeProfitHit}
              onStopLossHit={mockHandleStopLossHit}
              onOrderActivation={mockHandleOrderActivation}
              livePrice={1.0875}
              connectionStatus="connected"
              priceSource="integration-test"
              isAdmin={true}
              isCreator={true}
              isRecentClosure={false}
            />
            <LivePriceWidget 
              symbol="EURUSD"
              price={1.0875}
              className="integration-widget"
              compact={false}
            />
          </div>
        </TestWrapper>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(150); // Complex tree should render under 150ms
    });
  });
});