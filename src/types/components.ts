
// Export the correct TradeAlertData from the signals module
export type { TradeAlertData } from '@/components/signals/TradeAlertData';

// Complete TradeAlertCardProps interface with ALL required properties
export interface TradeAlertCardProps {
  alert: TradeAlertData;
  onUpdate?: (id: string, updates: any) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  // Add all missing properties that TradeAlertCard actually uses
  onStatusUpdate?: (alert: TradeAlertData, newStatus: string) => Promise<void>;
  onTakeProfitHit?: (alert: TradeAlertData, tpLevel: number) => Promise<void>;
  onStopLossHit?: (alert: TradeAlertData) => Promise<void>;
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
