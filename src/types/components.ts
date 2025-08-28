// Remove the duplicate TradeAlertData interface - it should only exist in src/components/signals/TradeAlertData.ts
// Export the correct one from the signals module
export type { TradeAlertData } from '@/components/signals/TradeAlertData';

// Keep other component types here if they exist
export interface TradeAlertCardProps {
  alert: TradeAlertData;
  onUpdate?: (id: string, updates: any) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}
