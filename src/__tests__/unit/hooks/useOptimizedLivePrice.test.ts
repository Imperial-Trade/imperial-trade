import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOptimizedLivePrice } from '@/hooks/useOptimizedLivePrice';
import { TestWrapper } from '@/test/utils/test-helpers';

// Mock the HybridWebSocket context for tests
vi.mock('@/contexts/HybridWebSocketPriceContext', () => ({
  useHybridWebSocketPrices: () => ({
    prices: {
      EURUSD: { price: 1.0500, change: 0.0010, changePercent: 0.095, timestamp: new Date().toISOString() }
    },
    connectionStatus: 'connected',
    dataSource: 'Enhanced WebSocket (100%)',
    lastUpdated: new Date(),
    errors: {},
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    getPrice: vi.fn((symbol) => ({ 
      price: 1.0500, 
      change: 0.0010, 
      changePercent: 0.095, 
      timestamp: new Date().toISOString(),
      symbol 
    })),
    refreshPrice: vi.fn(),
    getConnectionHealth: vi.fn(() => ({ isHealthy: true, lastUpdate: new Date() })),
    isUsingEnhancedSystem: true
  })
}));

describe('useOptimizedLivePrice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return price data for a symbol', async () => {
    const { result } = renderHook(
      () => useOptimizedLivePrice('EURUSD'),
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(result.current.price).toBe(1.0500);
      expect(result.current.connectionStatus).toBe('connected');
      // Remove priceUpdateSource check since it's not part of the new API
    });
  });

  it('should handle HTTP fallback when no session is available', async () => {
    // Mock no session scenario
    vi.mocked(require('@/integrations/supabase/client').supabase.auth.getSession)
      .mockResolvedValueOnce({ data: { session: null } });

    const { result } = renderHook(
      () => useOptimizedLivePrice('EURUSD'),
      { wrapper: TestWrapper }
    );

    // Should trigger immediate fallback (0ms delay) when no session
    await waitFor(() => {
      expect(result.current.price).toBeGreaterThan(0);
    });
  });

  it('should store prices in localStorage with TTL', async () => {
    const { result } = renderHook(
      () => useOptimizedLivePrice('EURUSD'),
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      const stored = localStorage.getItem('lastPrice:EURUSD');
      expect(stored).toBeTruthy();
      
      if (stored) {
        const { price, timestamp } = JSON.parse(stored);
        expect(price).toBe(1.0500);
        expect(new Date(timestamp)).toBeInstanceOf(Date);
      }
    });
  });

  it('should ignore stale localStorage prices older than 10 minutes', async () => {
    // Store old price
    const oldTimestamp = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
    localStorage.setItem('lastPrice:EURUSD', JSON.stringify({
      price: 0.9999,
      timestamp: oldTimestamp.toISOString()
    }));

    const { result } = renderHook(
      () => useOptimizedLivePrice('EURUSD'),
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      // Should not use the stale price
      expect(result.current.price).not.toBe(0.9999);
      expect(result.current.price).toBe(1.0500);
    });
  });
});