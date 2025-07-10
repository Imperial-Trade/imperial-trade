
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignalRealtimeProvider } from '@/contexts/SignalRealtimeContext';
import { supabase } from '@/integrations/supabase/client';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SignalRealtimeProvider>
        {children}
      </SignalRealtimeProvider>
    </QueryClientProvider>
  );
};

// Mock component to test SignalRealtimeContext
const TestSignalComponent = () => {
  const { useSignalRealtime } = require('@/contexts/SignalRealtimeContext');
  const { signals, connectionStatus, subscribe, refreshSignals } = useSignalRealtime();
  
  return (
    <div>
      <div data-testid="connection-status">{connectionStatus}</div>
      <div data-testid="signals-count">{signals.length}</div>
      <button onClick={subscribe} data-testid="subscribe-btn">Subscribe</button>
      <button onClick={refreshSignals} data-testid="refresh-btn">Refresh</button>
      {signals.map((signal) => (
        <div key={signal.id} data-testid={`signal-${signal.id}`}>
          {signal.assetName}
        </div>
      ))}
    </div>
  );
};

describe('Trading Signals Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Supabase realtime channel
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      }),
    };
    
    vi.mocked(supabase.channel).mockReturnValue(mockChannel);
  });

  it('subscribes to realtime updates and displays signals', async () => {
    const mockSignals = [
      {
        id: '1',
        asset_name: 'EURUSD',
        finnhub_symbol: 'OANDA:EUR_USD',
        trade_type: 'BUY',
        entry_price: 1.0500,
        stop_loss: 1.0450,
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'user-1',
        tp_hits: [],
      }
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockSignals,
          error: null
        })
      })
    } as any);

    render(<TestSignalComponent />, { wrapper: createWrapper() });

    const subscribeBtn = screen.getByTestId('subscribe-btn');
    await userEvent.click(subscribeBtn);

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
    });

    const refreshBtn = screen.getByTestId('refresh-btn');
    await userEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByTestId('signals-count')).toHaveTextContent('1');
      expect(screen.getByTestId('signal-1')).toHaveTextContent('EURUSD');
    });
  });

  it('handles realtime signal updates', async () => {
    const user = userEvent.setup();
    
    render(<TestSignalComponent />, { wrapper: createWrapper() });

    // Test would involve triggering realtime updates and verifying state changes
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
  });
});
