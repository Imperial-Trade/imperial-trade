
import type { TradeAlertData } from '@/components/signals/TradeAlertData';

// Re-export for external consumers if needed
export type { TradeAlertData } from '@/components/signals/TradeAlertData';

// Complete TradeAlertCardProps interface with ALL required properties
export interface TradeAlertCardProps {
  alert: TradeAlertData;
  onUpdate?: (id: string, updates: any) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;

  // Match actual handler usage across AdminTradeSignalsTab and SignalStream
  onStatusUpdate?: (alert: TradeAlertData, newStatus: string) => Promise<void>;
  onTakeProfitHit?: (
    alert: TradeAlertData, 
    newTPHits: number[], 
    shouldAutoClose?: boolean, 
    closeReason?: string
  ) => Promise<void>;
  onStopLossHit?: (alert: TradeAlertData, closeReason: string) => Promise<void>;
  onOrderActivation?: (alert: TradeAlertData) => Promise<void>;

  isAdmin?: boolean;
  isCreator?: boolean;
  livePrice?: number;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  priceSource?: string;
  isRecentClosure?: boolean;
  className?: string;
  testId?: string;
}

