/**
 * WebSocket Type Definitions
 * Provides strict type safety for real-time price and signal updates
 */

export interface PriceUpdate {
  symbol: string;
  bid: number | null;
  ask: number | null;
  mid: number;
  timestamp: string;
  source: 'tradermade' | 'websocket' | 'database';
}

export interface RealtimePriceEvent {
  type: 'price_update';
  payload: PriceUpdate;
}

export interface SignalUpdateEvent {
  type: 'signal_update' | 'signal_created' | 'signal_closed';
  payload: {
    signalId: string;
    status?: string;
    tpHits?: number[];
    closeReason?: string;
    notes?: string;
    updatedAt?: string;
    [key: string]: string | number | number[] | undefined;
  };
}

export interface ConnectionStateEvent {
  type: 'connection_status';
  payload: {
    status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';
    timestamp: string;
    error?: string;
  };
}

export type WebSocketEventType = 
  | RealtimePriceEvent 
  | SignalUpdateEvent 
  | ConnectionStateEvent;

export interface WebSocketMessageHandler {
  onPriceUpdate?: (update: PriceUpdate) => void;
  onSignalUpdate?: (event: SignalUpdateEvent['payload']) => void;
  onConnectionChange?: (status: ConnectionStateEvent['payload']) => void;
  onError?: (error: Error) => void;
}

export interface WebSocketSubscription {
  symbols: string[];
  handler: WebSocketMessageHandler;
  subscriptionId: string;
}
