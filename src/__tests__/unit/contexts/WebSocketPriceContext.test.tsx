
import React from 'react';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketPriceProvider, useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Mock sending data
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

// Mock global WebSocket
const originalWebSocket = global.WebSocket;

describe('WebSocketPriceContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.WebSocket = MockWebSocket as any;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  const TestComponent = () => {
    const { prices, connectionStatus, subscribe, getPrice } = useWebSocketPrices();
    return (
      <div>
        <div data-testid="connection-status">{connectionStatus}</div>
        <div data-testid="price-count">{Object.keys(prices).length}</div>
        <button onClick={() => subscribe(['AAPL'])} data-testid="subscribe-btn">
          Subscribe
        </button>
        <div data-testid="aapl-price">
          {getPrice('AAPL')?.price || 'No price'}
        </div>
      </div>
    );
  };

  it('provides WebSocket context correctly', () => {
    const { getByTestId } = render(
      <WebSocketPriceProvider>
        <TestComponent />
      </WebSocketPriceProvider>
    );

    expect(getByTestId('connection-status')).toHaveTextContent('disconnected');
    expect(getByTestId('price-count')).toHaveTextContent('0');
  });

  it('establishes WebSocket connection when subscribing', async () => {
    const { getByTestId } = render(
      <WebSocketPriceProvider>
        <TestComponent />
      </WebSocketPriceProvider>
    );

    act(() => {
      getByTestId('subscribe-btn').click();
    });

    await waitFor(() => {
      expect(getByTestId('connection-status')).toHaveTextContent('connected');
    });
  });

  it('handles price updates correctly', async () => {
    let mockWebSocket: MockWebSocket;
    
    // Capture the WebSocket instance
    const OriginalMockWebSocket = MockWebSocket;
    global.WebSocket = class extends OriginalMockWebSocket {
      constructor(url: string) {
        super(url);
        mockWebSocket = this;
      }
    } as any;

    const { getByTestId } = render(
      <WebSocketPriceProvider>
        <TestComponent />
      </WebSocketPriceProvider>
    );

    act(() => {
      getByTestId('subscribe-btn').click();
    });

    await waitFor(() => {
      expect(getByTestId('connection-status')).toHaveTextContent('connected');
    });

    // Simulate price update message
    const priceUpdate = {
      type: 'price_update',
      data: [{
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        timestamp: new Date().toISOString()
      }]
    };

    act(() => {
      mockWebSocket!.onmessage?.(new MessageEvent('message', {
        data: JSON.stringify(priceUpdate)
      }));
    });

    await waitFor(() => {
      expect(getByTestId('aapl-price')).toHaveTextContent('150.25');
    });
  });

  it('handles connection errors gracefully', async () => {
    // Mock WebSocket that immediately errors
    global.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        setTimeout(() => {
          this.onerror?.(new Event('error'));
        }, 5);
      }
    } as any;

    const { getByTestId } = render(
      <WebSocketPriceProvider>
        <TestComponent />
      </WebSocketPriceProvider>
    );

    act(() => {
      getByTestId('subscribe-btn').click();
    });

    await waitFor(() => {
      expect(getByTestId('connection-status')).toHaveTextContent('error');
    });
  });

  it('handles malformed messages gracefully', async () => {
    let mockWebSocket: MockWebSocket;
    
    global.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWebSocket = this;
      }
    } as any;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <WebSocketPriceProvider>
        <TestComponent />
      </WebSocketPriceProvider>
    );

    await waitFor(() => {
      // Send malformed JSON
      act(() => {
        mockWebSocket!.onmessage?.(new MessageEvent('message', {
          data: 'invalid json'
        }));
      });
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error parsing WebSocket message:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  describe('hook usage', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useWebSocketPrices());
      }).toThrow('useWebSocketPrices must be used within WebSocketPriceProvider');

      consoleSpy.mockRestore();
    });

    it('provides all expected methods and properties', () => {
      const { result } = renderHook(() => useWebSocketPrices(), {
        wrapper: ({ children }) => (
          <WebSocketPriceProvider>{children}</WebSocketPriceProvider>
        )
      });

      expect(result.current).toHaveProperty('prices');
      expect(result.current).toHaveProperty('connectionStatus');
      expect(result.current).toHaveProperty('subscribe');
      expect(result.current).toHaveProperty('unsubscribe');
      expect(result.current).toHaveProperty('getPrice');
      expect(result.current).toHaveProperty('pauseUpdates');
      expect(result.current).toHaveProperty('resumeUpdates');
      expect(result.current).toHaveProperty('refreshPrice');
      expect(result.current).toHaveProperty('lastUpdated');
    });
  });

  describe('pause and resume functionality', () => {
    it('pauses and resumes updates correctly', async () => {
      const { result } = renderHook(() => useWebSocketPrices(), {
        wrapper: ({ children }) => (
          <WebSocketPriceProvider>{children}</WebSocketPriceProvider>
        )
      });

      act(() => {
        result.current.pauseUpdates();
      });

      // Pausing should change update interval and set paused state
      expect(result.current.connectionStatus).toBe('disconnected'); // Should remain disconnected when paused

      act(() => {
        result.current.resumeUpdates();
      });

      // Resuming should restore normal operation
      expect(result.current.connectionStatus).toBe('disconnected'); // Will connect when subscribing
    });
  });
});
