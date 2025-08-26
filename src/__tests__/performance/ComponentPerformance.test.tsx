
import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { TradeAlertCard } from '@/components/signals/TradeAlertCard';
import { TradeAlertData } from '@/types/TradeAlertData';

// Mock data that includes all required fields
const mockAlert: TradeAlertData = {
  id: '1',
  user_id: 'test-user-id',
  asset_name: 'EUR/USD',
  tradermade_symbol: 'EURUSD',
  trade_type: 'buy',
  entry_price: 1.1000,
  stop_loss: 1.0950,
  status: 'active',
  tp1: 1.1050,
  tp2: 1.1100,
  tp_hits: [],
  notes: 'Test signal',
  created_date: '2023-01-01T00:00:00Z',
  updated_date: '2023-01-01T00:00:00Z',
  creator: {
    id: 'creator-id',
    display_name: 'Test Creator',
    role: 'educator',
    avatar_url: null
  }
};

const mockProps = {
  alert: mockAlert,
  onStatusUpdate: vi.fn(),
  onTakeProfitHit: vi.fn(),
  onStopLossHit: vi.fn(),
  onOrderActivation: vi.fn(),
  isAdmin: false,
  isCreator: false,
  livePrice: 1.1025,
  connectionStatus: 'connected' as const,
  priceSource: 'test',
  isRecentClosure: false
};

describe('Component Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render TradeAlertCard efficiently', () => {
    const startTime = performance.now();
    
    render(<TradeAlertCard {...mockProps} />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within 50ms
    expect(renderTime).toBeLessThan(50);
  });

  it('should handle multiple TradeAlertCards efficiently', () => {
    const startTime = performance.now();
    
    render(
      <div>
        {Array(10).fill(null).map((_, index) => (
          <TradeAlertCard 
            key={index} 
            {...mockProps} 
            alert={{
              ...mockAlert,
              id: `alert-${index}`,
              asset_name: `Test Asset ${index}`
            }}
          />
        ))}
      </div>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render 10 components within 200ms
    expect(renderTime).toBeLessThan(200);
  });

  it('should render with live price updates efficiently', () => {
    const startTime = performance.now();
    
    render(
      <TradeAlertCard 
        {...mockProps} 
        livePrice={1.1030}
      />
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should handle live price updates within 30ms
    expect(renderTime).toBeLessThan(30);
  });
});
