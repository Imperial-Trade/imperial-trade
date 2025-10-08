/**
 * WebSocket Event Types - Enhanced Type Safety for Phase 2
 * 
 * Provides strict typing for all WebSocket events and payloads
 * to prevent implicit 'any' types and improve compile-time safety
 */

export interface PriceUpdate {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  mid?: number;
  timestamp: string;
  change?: number;
  changePercent?: number;
}

export interface RealtimePriceEvent {
  type: 'broadcast';
  event: 'price-update';
  payload: {
    prices: PriceUpdate[];
    source: 'tradermade' | 'fallback' | 'polling';
    timestamp: string;
  };
}

export interface SignalUpdateEvent {
  type: 'postgres_changes';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'trade_alerts';
  schema: 'public';
  new?: Record<string, any>;
  old?: Record<string, any>;
}

export interface WebSocketMessageHandler<T = any> {
  (event: T): void | Promise<void>;
}

export interface ConnectionStateEvent {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  timestamp: number;
  error?: string;
}

export type WebSocketEventType = 
  | RealtimePriceEvent 
  | SignalUpdateEvent 
  | ConnectionStateEvent;
