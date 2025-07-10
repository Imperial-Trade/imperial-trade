
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOptimizedTrading } from '@/hooks/useOptimizedTrading';
import { TestWrapper } from '@/test/utils/test-helpers';

// Mock the dependent hooks
vi.mock('@/hooks/useOptimizedTradingRealtime', () => ({
  useOptimizedTradingRealtime: vi.fn()
}));

vi.mock('@/hooks/trading/useTradingFallback', () => ({
  useTradingFallback: vi.fn()
}));

vi.mock('@/hooks/trading/useTradingPolling', () => ({
  useTradingPolling: vi.fn()
}));

vi.mock('@/hooks/trading/useTradingOperations', () => ({
  useTradingOperations: vi.fn()
}));

import { useOptimizedTradingRealtime } from '@/hooks/useOptimizedTradingRealtime';
import { useTradingFallback } from '@/hooks/trading/useTradingFallback';
import { useTradingPolling } from '@/hooks/trading/useTradingPolling';
import { useTradingOperations } from '@/hooks/trading/useTradingOperations';

const mockUseOptimizedTradingRealtime = useOptimizedTradingRealtime as any;
const mockUseTradingFallback = useTradingFallback as any;
const mockUseTradingPolling = useTradingPolling as any;
const mockUseTradingOperations = useTradingOperations as any;

describe('useOptimizedTrading', () => {
  const mockAlerts = [
    {
      id: '1',
      assetName: 'AAPL',
      finnhubSymbol: 'AAPL',
      tradeType: 'buy' as const,
      entryPrice: 150.00,
      stopLoss: 145.00,
      status: 'active' as const,
      tp1: 155.00,
      tpHits: [],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    }
  ];

  const mockOperations = {
    createAlert: vi.fn(),
    updateAlert: vi.fn(),
    deleteAlert: vi.fn(),
    refreshAlerts: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockUseOptimizedTradingRealtime.mockReturnValue({
      alerts: mockAlerts,
      isLoading: false,
      error: null,
      connectionStatus: 'connected',
      lastUpdated: new Date(),
      createAlert: mockOperations.createAlert,
      updateAlert: mockOperations.updateAlert,
      deleteAlert: mockOperations.deleteAlert,
      refreshAlerts: mockOperations.refreshAlerts
    });

    mockUseTradingFallback.mockReturnValue({
      fallbackAlerts: [],
      fallbackLoading: false,
      fallbackError: null,
      fetchAlertsFallback: vi.fn()
    });

    mockUseTradingPolling.mockImplementation(() => {});

    mockUseTradingOperations.mockReturnValue(mockOperations);
  });

  it('returns realtime data when connection is stable', () => {
    const { result } = renderHook(
      () => useOptimizedTrading('user-123'),
      { wrapper: TestWrapper }
    );

    expect(result.current.alerts).toEqual(mockAlerts);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.connectionStatus).toBe('connected');
  });

  it('switches to fallback when realtime connection fails', () => {
    const fallbackAlerts = [
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
        updatedAt: '2023-01-01T00:00:00Z'
      }
    ];

    mockUseOptimizedTradingRealtime.mockReturnValue({
      alerts: [],
      isLoading: false,
      error: 'Connection failed',
      connectionStatus: 'error',
      lastUpdated: null,
      createAlert: mockOperations.createAlert,
      updateAlert: mockOperations.updateAlert,
      deleteAlert: mockOperations.deleteAlert,
      refreshAlerts: mockOperations.refreshAlerts
    });

    mockUseTradingFallback.mockReturnValue({
      fallbackAlerts,
      fallbackLoading: false,
      fallbackError: null,
      fetchAlertsFallback: vi.fn()
    });

    const { result } = renderHook(
      () => useOptimizedTrading('user-123'),
      { wrapper: TestWrapper }
    );

    expect(result.current.alerts).toEqual(fallbackAlerts);
    expect(result.current.error).toBe(null); // Should use fallback error, not realtime error
  });

  it('handles showAllSignals parameter correctly', () => {
    renderHook(
      () => useOptimizedTrading('user-123', true),
      { wrapper: TestWrapper }
    );

    expect(mockUseOptimizedTradingRealtime).toHaveBeenCalledWith('user-123', true);
    expect(mockUseTradingFallback).toHaveBeenCalledWith({
      userId: 'user-123',
      showAllSignals: true,
      shouldUseFallback: false
    });
  });

  it('exposes all trading operations', () => {
    const { result } = renderHook(
      () => useOptimizedTrading('user-123'),
      { wrapper: TestWrapper }
    );

    expect(result.current.createAlert).toBe(mockOperations.createAlert);
    expect(result.current.updateAlert).toBe(mockOperations.updateAlert);
    expect(result.current.deleteAlert).toBe(mockOperations.deleteAlert);
    expect(result.current.refreshAlerts).toBe(mockOperations.refreshAlerts);
  });

  it('handles loading states correctly', () => {
    mockUseOptimizedTradingRealtime.mockReturnValue({
      alerts: [],
      isLoading: true,
      error: null,
      connectionStatus: 'connecting',
      lastUpdated: null,
      createAlert: mockOperations.createAlert,
      updateAlert: mockOperations.updateAlert,
      deleteAlert: mockOperations.deleteAlert,
      refreshAlerts: mockOperations.refreshAlerts
    });

    const { result } = renderHook(
      () => useOptimizedTrading('user-123'),
      { wrapper: TestWrapper }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.connectionStatus).toBe('connecting');
  });

  it('handles empty userId correctly', () => {
    renderHook(
      () => useOptimizedTrading(''),
      { wrapper: TestWrapper }
    );

    expect(mockUseTradingFallback).toHaveBeenCalledWith({
      userId: '',
      showAllSignals: false,
      shouldUseFallback: false
    });
  });
});
