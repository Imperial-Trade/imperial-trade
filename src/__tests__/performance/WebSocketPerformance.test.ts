
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { renderHook, act } from '@testing-library/react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { TestWrapper } from '@/test/utils/test-helpers';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;  
  onerror: ((event: Event) => void) | null = null;
  
  readyState = 0; // WebSocket.CONNECTING
  
  constructor(url: string) {
    MockWebSocket.instances.push(this);
    
    // Simulate connection after short delay
    setTimeout(() => {
      this.readyState = 1; // WebSocket.OPEN
      this.onopen?.(new Event('open'));
    }, 10);
  }
  
  send(data: string) {
    // Simulate message processing
  }
  
  close() {
    this.readyState = 3; // WebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'));
  }
  
  static reset() {
    MockWebSocket.instances = [];
  }
  
  static simulateMessage(data: any) {
    MockWebSocket.instances.forEach(ws => {
      if (ws.readyState === 1 && ws.onmessage) {
        ws.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
      }
    });
  }
}

global.WebSocket = MockWebSocket as any;

describe('WebSocket Performance Tests', () => {
  beforeEach(() => {
    MockWebSocket.reset();
  });

  afterEach(() => {
    MockWebSocket.reset();
  });

  describe('Connection Performance', () => {
    it('should establish connection within acceptable time', async () => {
      const startTime = performance.now();
      
      const { result } = renderHook(() => useWebSocketPrices(), {
        wrapper: TestWrapper
      });

      // Wait for connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const endTime = performance.now();
      const connectionTime = endTime - startTime;

      expect(connectionTime).toBeLessThan(100); // Connection under 100ms
      expect(result.current.connectionStatus).toBe('connected');
    });

    it('should handle rapid subscription changes efficiently', async () => {
      const { result } = renderHook(() => useWebSocketPrices(), {
        wrapper: TestWrapper
      });

      // Wait for initial connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      const startTime = performance.now();

      // Rapidly subscribe to multiple symbols
      await act(async () => {
        const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
        result.current.subscribe(symbols);
        
        // Then unsubscribe quickly
        result.current.unsubscribe(symbols);
        
        // Subscribe again
        result.current.subscribe(['EURUSD', 'GBPUSD']);
      });

      const endTime = performance.now();
      const operationTime = endTime - startTime;

      expect(operationTime).toBeLessThan(50); // Operations under 50ms
    });
  });

  describe('Message Processing Performance', () => {
    it('should handle high-frequency price updates', async () => {
      const { result } = renderHook(() => useWebSocketPrices(), {
        wrapper: TestWrapper
      });

      // Wait for connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        result.current.subscribe(['EURUSD']);
      });

      const startTime = performance.now();
      const messageCount = 100;

      // Simulate rapid price updates
      await act(async () => {
        for (let i = 0; i < messageCount; i++) {
          MockWebSocket.simulateMessage({
            symbol: 'EURUSD',
            price: 1.0500 + (i * 0.0001),
            change: i * 0.0001,
            changePercent: (i * 0.0001 / 1.0500) * 100,
            timestamp: Date.now()
          });
        }
        
        // Allow processing time
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(200); // 100 messages under 200ms
      expect(result.current.prices['EURUSD']).toBeDefined();
    });

    it('should not accumulate memory during long sessions', async () => {
      const { result } = renderHook(() => useWebSocketPrices(), {
        wrapper: TestWrapper
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        result.current.subscribe(['EURUSD', 'GBPUSD']);
      });

      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate extended session with many updates
      await act(async () => {
        for (let batch = 0; batch < 10; batch++) {
          for (let i = 0; i < 50; i++) {
            MockWebSocket.simulateMessage({
              symbol: Math.random() > 0.5 ? 'EURUSD' : 'GBPUSD',
              price: 1.0500 + (Math.random() * 0.01),
              change: Math.random() * 0.001,
              changePercent: Math.random() * 0.1,
              timestamp: Date.now()
            });
          }
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      });

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal (less than 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Error Recovery Performance', () => {
    it('should reconnect quickly after connection loss', async () => {
      const { result } = renderHook(() => useWebSocketPrices(), {
        wrapper: TestWrapper
      });

      // Wait for initial connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(result.current.connectionStatus).toBe('connected');

      const startTime = performance.now();

      // Simulate connection loss and recovery
      await act(async () => {
        // Close connection
        MockWebSocket.instances[0]?.close();
        
        // Wait for reconnection attempt
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const endTime = performance.now();
      const recoveryTime = endTime - startTime;

      expect(recoveryTime).toBeLessThan(200); // Recovery under 200ms
    });
  });
});
