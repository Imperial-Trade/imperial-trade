
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSignalRealtime } from '@/hooks/useSignalRealtime';
import { useSignalRealtime as useSignalRealtimeContext } from '@/contexts/SignalRealtimeContext';
import { tradingApiService } from '@/api/services/TradingApiService';
import { TestWrapper } from '@/test/utils/test-helpers';

// Mock dependencies
vi.mock('@/contexts/SignalRealtimeContext');
vi.mock('@/api/services/TradingApiService');

const mockUseSignalRealtimeContext = useSignalRealtime as any;

describe('useSignalRealtime', () => {
  const mockSignals = [
    {
      id: '1',
      assetName: 'AAPL',
      finnhubSymbol: 'AAPL',
      tradeType: 'buy' as const,
      entryPrice: 150.00,
      stopLoss: 145.00,
      status: 'active' as const,
      tpHits: [],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      creator: {
        id: 'user-123',
        display_name: 'Test User',
        role: 'user',
        avatar_url: null
      }
    },
    {
      id: '2',
      assetName: 'TSLA',
      finnhubSymbol: 'TSLA',
      tradeType: 'sell' as const,
      entryPrice: 200.00,
      stopLoss: 205.00,
      status: 'active' as const,
      tpHits: [],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      creator: {
        id: 'user-456',
        display_name: 'Another User',
        role: 'user',
        avatar_url: null
      }
    }
  ];

  const mockContextValue = {
    signals: mockSignals,
    connectionStatus: 'connected' as const,
    lastUpdated: new Date(),
    error: null,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    refreshSignals: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSignalRealtimeContext.mockReturnValue(mockContextValue);
    (tradingApiService.updateAlert as any) = vi.fn();
  });

  it('filters signals by userId when showAllSignals is false', () => {
    const { result } = renderHook(
      () => useSignalRealtime('user-123', false),
      { wrapper: TestWrapper }
    );

    const expectedFilteredSignals = mockSignals.filter(
      signal => signal.creator?.id === 'user-123'
    );
    
    expect(result.current.alerts).toEqual(expectedFilteredSignals);
    expect(result.current.alerts).toHaveLength(1);
  });

  it('returns all signals when showAllSignals is true', () => {
    const { result } = renderHook(
      () => useSignalRealtime('user-123', true),
      { wrapper: TestWrapper }
    );

    expect(result.current.alerts).toEqual(mockSignals);
    expect(result.current.alerts).toHaveLength(2);
  });

  it('returns empty array for empty userId when showAllSignals is false', () => {
    const { result } = renderHook(
      () => useSignalRealtime('', false),
      { wrapper: TestWrapper }
    );

    expect(result.current.alerts).toEqual([]);
  });

  it('subscribes on mount and unsubscribes on unmount', () => {
    const { unmount } = renderHook(
      () => useSignalRealtime('user-123', false),
      { wrapper: TestWrapper }
    );

    expect(mockContextValue.subscribe).toHaveBeenCalled();

    unmount();

    expect(mockContextValue.unsubscribe).toHaveBeenCalled();
  });

  it('handles connection status correctly', () => {
    mockUseSignalRealtimeContext.mockReturnValue({
      ...mockContextValue,
      connectionStatus: 'connecting'
    });

    const { result } = renderHook(
      () => useSignalRealtime('user-123', false),
      { wrapper: TestWrapper }
    );

    expect(result.current.connectionStatus).toBe('connecting');
  });

  it('handles errors from context', () => {
    const testError = 'Connection failed';
    mockUseSignalRealtimeContext.mockReturnValue({
      ...mockContextValue,
      error: testError
    });

    const { result } = renderHook(
      () => useSignalRealtime('user-123', false),
      { wrapper: TestWrapper }
    );

    expect(result.current.error).toBe(testError);
  });

  it('updates alert successfully', async () => {
    const mockUpdateResult = {
      success: true,
      data: {
        id: '1',
        assetName: 'AAPL',
        finnhubSymbol: 'AAPL',
        tradeType: 'buy' as const,
        entryPrice: 150.00,
        stopLoss: 145.00,
        status: 'closed' as const,
        tpHits: [1],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      }
    };

    (tradingApiService.updateAlert as any).mockResolvedValue(mockUpdateResult);

    const { result } = renderHook(
      () => useSignalRealtime('user-123', false),
      { wrapper: TestWrapper }
    );

    await act(async () => {
      const updateResult = await result.current.updateAlert('1', { status: 'closed' });
      expect(updateResult).toEqual(mockUpdateResult.data);
    });

    expect(tradingApiService.updateAlert).toHaveBeenCalledWith('1', { status: 'closed' }, 'user-123');
  });

  it('handles update alert failure', async () => {
    const mockUpdateResult = {
      success: false,
      error: 'Update failed'
    };

    (tradingApiService.updateAlert as any).mockResolvedValue(mockUpdateResult);

    const { result } = renderHook(
      () => useSignalRealtime('user-123', false),
      { wrapper: TestWrapper }
    );

    await act(async () => {
      const updateResult = await result.current.updateAlert('1', { status: 'closed' });
      expect(updateResult).toBeNull();
    });

    expect(result.current.error).toBe('Update failed');
  });

  it('refreshes alerts successfully', async () => {
    const { result } = renderHook(
      () => useSignalRealtime('user-123', false),
      { wrapper: TestWrapper }
    );

    await act(async () => {
      await result.current.refreshAlerts();
    });

    expect(mockContextValue.refreshSignals).toHaveBeenCalled();
  });

  it('handles refresh alerts error', async () => {
    const refreshError = new Error('Refresh failed');
    mockContextValue.refreshSignals.mockRejectedValue(refreshError);

    const { result } = renderHook(
      () => useSignalRealtime('user-123', false),
      { wrapper: TestWrapper }
    );

    await act(async () => {
      await result.current.refreshAlerts();
    });

    expect(result.current.error).toBe('Refresh failed');
  });

  it('does not update alert with invalid userId', async () => {
    const { result } = renderHook(
      () => useSignalRealtime('', false),
      { wrapper: TestWrapper }
    );

    await act(async () => {
      const updateResult = await result.current.updateAlert('1', { status: 'closed' });
      expect(updateResult).toBeNull();
    });

    expect(tradingApiService.updateAlert).not.toHaveBeenCalled();
  });
});
