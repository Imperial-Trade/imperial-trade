
import { render } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import TradeAlertCard from '@/components/signals/TradeAlertCard';
import { TradeAlertData } from '@/components/signals/TradeAlertData';

// Mock the required contexts and hooks
vi.mock('@/contexts/WebSocketPriceContext', () => ({
  useWebSocketPrices: () => ({
    getPrice: vi.fn(() => ({ price: 1.2345 }))
  })
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

describe('Component Performance Tests', () => {
  const mockAlert: TradeAlertData = {
    id: '1',
    asset_name: 'EUR/USD',
    tradermade_symbol: 'EURUSD',
    trade_type: 'buy',
    entry_price: 1.2000,
    stop_loss: 1.1900,
    status: 'active',
    tp1: 1.2100,
    tp2: 1.2200,
    tp3: 1.2300,
    tp_hits: [],
    notes: 'Test trade',
    created_date: '2023-01-01T00:00:00Z',
    updated_date: '2023-01-01T00:00:00Z'
  };

  it('should render TradeAlertCard efficiently', () => {
    const onStatusUpdate = vi.fn();
    const onTakeProfitHit = vi.fn();
    const onStopLossHit = vi.fn();
    const onOrderActivation = vi.fn();

    const startTime = performance.now();
    
    render(
      <TradeAlertCard 
        alert={mockAlert}
        onStatusUpdate={onStatusUpdate}
        onTakeProfitHit={onTakeProfitHit}
        onStopLossHit={onStopLossHit}
        onOrderActivation={onOrderActivation}
        isAdmin={false}
        isCreator={true}
        isRecentClosure={false}
      />
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within reasonable time (less than 100ms)
    expect(renderTime).toBeLessThan(100);
  });

  it('should handle multiple re-renders efficiently', () => {
    const onStatusUpdate = vi.fn();
    const onTakeProfitHit = vi.fn();
    const onStopLossHit = vi.fn();
    const onOrderActivation = vi.fn();

    const startTime = performance.now();
    
    // Render multiple times to test performance
    for (let i = 0; i < 10; i++) {
      render(
        <TradeAlertCard 
          alert={mockAlert}
          onStatusUpdate={onStatusUpdate}
          onTakeProfitHit={onTakeProfitHit}
          onStopLossHit={onStopLossHit}
          onOrderActivation={onOrderActivation}
          isAdmin={false}
          isCreator={true}
          isRecentClosure={false}
        />
      );
    }
    
    const endTime = performance.now();
    const averageRenderTime = (endTime - startTime) / 10;
    
    // Average render time should be reasonable
    expect(averageRenderTime).toBeLessThan(50);
  });
});
