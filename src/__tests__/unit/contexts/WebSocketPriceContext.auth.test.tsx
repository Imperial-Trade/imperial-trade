import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { WebSocketPriceProvider, useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sentMessages: string[] = [];

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code: code || 1000, reason }));
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { 
        session: { 
          access_token: 'mock_token_123' 
        } 
      }
    })
  }
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Test component
const TestComponent: React.FC = () => {
  const { connectionStatus, subscribe, unsubscribe } = useWebSocketPrices();
  
  return (
    <div>
      <div data-testid="connection-status">{connectionStatus}</div>
      <button 
        data-testid="subscribe-btn" 
        onClick={() => subscribe(['BTCUSD'])}
      >
        Subscribe
      </button>
      <button 
        data-testid="unsubscribe-btn" 
        onClick={() => unsubscribe(['BTCUSD'])}
      >
        Unsubscribe
      </button>
    </div>
  );
};

describe('WebSocketPriceContext Authentication', () => {
  beforeEach(() => {
    global.WebSocket = MockWebSocket as any;
    MockWebSocket.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    MockWebSocket.reset();
  });

  it('should authenticate with access token on connection', async () => {
    render(
      <WebSocketPriceProvider>
        <TestComponent />
      </WebSocketPriceProvider>
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    const ws = MockWebSocket.instances[0];
    
    await waitFor(() => {
      expect(ws.sentMessages).toHaveLength(1);
    });

    const authMessage = JSON.parse(ws.sentMessages[0]);
    expect(authMessage).toEqual({
      action: 'authenticate',
      token: 'mock_token_123'
    });
  });

  it('should queue subscriptions until authenticated', async () => {
    render(
      <WebSocketPriceProvider>
        <TestComponent />
      </WebSocketPriceProvider>
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    const ws = MockWebSocket.instances[0];
    
    // Try to subscribe before authentication
    act(() => {
      screen.getByTestId('subscribe-btn').click();
    });

    // Should only have auth message, no subscription yet
    await waitFor(() => {
      expect(ws.sentMessages).toHaveLength(1);
    });

    // Simulate successful auth
    act(() => {
      ws.simulateMessage({
        type: 'auth_success',
        message: 'Authentication successful'
      });
    });

    // Now should process pending subscription
    await waitFor(() => {
      expect(ws.sentMessages).toHaveLength(2);
    });

    const subscribeMessage = JSON.parse(ws.sentMessages[1]);
    expect(subscribeMessage.action).toBe('subscribe');
    expect(subscribeMessage.symbols).toContain('BTCUSD');
  });

  it('should handle authentication errors', async () => {
    render(
      <WebSocketPriceProvider>
        <TestComponent />
      </WebSocketPriceProvider>
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    const ws = MockWebSocket.instances[0];

    // Simulate auth error
    act(() => {
      ws.simulateMessage({
        type: 'auth_error',
        message: 'Invalid token'
      });
    });

    // Connection status should remain connected but auth should fail
    expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
  });

  it('should handle subscription limit exceeded error', async () => {
    render(
      <WebSocketPriceProvider>
        <TestComponent />
      </WebSocketPriceProvider>
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    const ws = MockWebSocket.instances[0];

    // Authenticate first
    act(() => {
      ws.simulateMessage({
        type: 'auth_success',
        message: 'Authentication successful'
      });
    });

    // Simulate subscription limit error
    act(() => {
      ws.simulateMessage({
        type: 'error',
        code: 'max_subscriptions_exceeded',
        message: 'Subscription limit exceeded (max: 20)'
      });
    });

    // Should handle the specific error code
    await waitFor(() => {
      expect(ws.sentMessages).toHaveLength(1); // Only auth message
    });
  });

  it('should clear auth timer on all close paths', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    render(
      <WebSocketPriceProvider>
        <TestComponent />
      </WebSocketPriceProvider>
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    const ws = MockWebSocket.instances[0];

    // Test close event
    act(() => {
      ws.close();
    });

    // Test error event  
    act(() => {
      ws.simulateError();
    });

    // Verify clearTimeout was called (auth timer cleanup)
    expect(clearTimeoutSpy).toHaveBeenCalled();
    
    clearTimeoutSpy.mockRestore();
  });

  it('should only authenticate once (idempotent)', async () => {
    render(
      <WebSocketPriceProvider>
        <TestComponent />
      </WebSocketPriceProvider>
    );

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    const ws = MockWebSocket.instances[0];

    // Simulate successful auth
    act(() => {
      ws.simulateMessage({
        type: 'auth_success',
        message: 'Authentication successful'
      });
    });

    // Clear sent messages
    ws.sentMessages = [];

    // Try to subscribe (should work immediately)
    act(() => {
      screen.getByTestId('subscribe-btn').click();
    });

    await waitFor(() => {
      expect(ws.sentMessages).toHaveLength(1);
    });

    const subscribeMessage = JSON.parse(ws.sentMessages[0]);
    expect(subscribeMessage.action).toBe('subscribe');
  });
});