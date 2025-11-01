
import { QueryClient } from '@tanstack/react-query';
import { vi } from 'vitest';

export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

export const mockSupabaseAuth = () => {
  return {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
  };
};

export const mockSupabaseDatabase = () => {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          limit: vi.fn(),
          order: vi.fn(),
        })),
        limit: vi.fn(),
        order: vi.fn(),
        in: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  };
};

export const mockSupabaseFunctions = () => {
  return {
    invoke: vi.fn(),
  };
};

export const mockSupabaseRealtime = () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };

  return {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  };
};

export const waitForNextTick = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  });
  window.IntersectionObserver = mockIntersectionObserver;
  window.IntersectionObserverEntry = vi.fn();
};

export const mockResizeObserver = () => {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  });
  window.ResizeObserver = mockResizeObserver;
};

export const mockWebSocket = () => {
  const mockWebSocket = vi.fn();
  mockWebSocket.prototype.send = vi.fn();
  mockWebSocket.prototype.close = vi.fn();
  mockWebSocket.prototype.addEventListener = vi.fn();
  mockWebSocket.prototype.removeEventListener = vi.fn();
  global.WebSocket = mockWebSocket as any;
};

export const mockLocalStorage = () => {
  const mockStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
  });
  return mockStorage;
};

export const simulateNetworkDelay = (ms: number = 100) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const createMockFile = (name: string, content: string, type: string = 'text/plain') => {
  return new File([content], name, { type });
};

export const triggerResize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { value: width });
  Object.defineProperty(window, 'innerHeight', { value: height });
  window.dispatchEvent(new Event('resize'));
};

export const mockMediaQuery = (query: string, matches: boolean = false) => {
  const mockMatchMedia = vi.fn().mockImplementation(() => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.matchMedia = mockMatchMedia;
  return mockMatchMedia;
};
