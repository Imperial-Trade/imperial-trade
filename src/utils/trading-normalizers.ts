import { TradeAlertStatus, TradeAlertCloseReason, TradeType } from '@/types/trading';

/**
 * Trading data normalizers - ensure consistent data structure for UI components
 */

export interface NormalizedCardAlert {
  id: string;
  asset_name: string;
  tradermade_symbol?: string;
  trade_type: TradeType;
  entry_price: number;
  stop_loss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tp_hits: number[];
  close_reason?: TradeAlertCloseReason | null;
  status: TradeAlertStatus;
  created_date: string;
  updated_date?: string;
  creator?: any;
  notes?: string;
}

/**
 * Normalize alert data for TradeAlertCard consumption
 * Ensures tp_hits is always an array and numbers are properly coerced
 */
export function toCardAlert(alert: any, livePrice?: number): NormalizedCardAlert & { livePrice?: number } {
  // Coerce numbers with fallback defaults
  const entryPrice = typeof alert.entry_price === 'number' 
    ? alert.entry_price 
    : typeof alert.entryPrice === 'number' 
      ? alert.entryPrice 
      : parseFloat(alert.entry_price || alert.entryPrice || '0') || 0;

  const stopLoss = typeof alert.stop_loss === 'number'
    ? alert.stop_loss
    : typeof alert.stopLoss === 'number'
      ? alert.stopLoss
      : parseFloat(alert.stop_loss || alert.stopLoss || '0') || 0;

  // Helper to safely parse TP values
  const parseTP = (value: any): number | undefined => {
    if (typeof value === 'number' && value > 0) return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return parsed > 0 ? parsed : undefined;
    }
    return undefined;
  };

  // Normalize tp_hits to always be an array of numbers
  let tpHits: number[] = [];
  if (Array.isArray(alert.tp_hits)) {
    tpHits = alert.tp_hits.filter((tp: any) => typeof tp === 'number' && tp > 0);
  } else if (Array.isArray(alert.tpHits)) {
    tpHits = alert.tpHits.filter((tp: any) => typeof tp === 'number' && tp > 0);
  }

  // Ensure valid status
  const validStatuses: TradeAlertStatus[] = ['pending', 'active', 'closed', 'partially_profited'];
  const status: TradeAlertStatus = validStatuses.includes(alert.status) ? alert.status : 'pending';

  // Ensure valid trade type
  const validTradeTypes: TradeType[] = ['buy', 'sell', 'buy_limit', 'sell_limit'];
  const tradeType: TradeType = validTradeTypes.includes(alert.trade_type || alert.tradeType) 
    ? (alert.trade_type || alert.tradeType) 
    : 'buy';

  const normalized: NormalizedCardAlert = {
    id: alert.id,
    asset_name: alert.asset_name || alert.assetName || 'Unknown Asset',
    tradermade_symbol: alert.tradermade_symbol || alert.tradermadeSymbol,
    trade_type: tradeType,
    entry_price: entryPrice,
    stop_loss: stopLoss,
    tp1: parseTP(alert.tp1),
    tp2: parseTP(alert.tp2),
    tp3: parseTP(alert.tp3),
    tp4: parseTP(alert.tp4),
    tp5: parseTP(alert.tp5),
    tp_hits: tpHits,
    close_reason: alert.close_reason || alert.closeReason || null,
    status,
    created_date: alert.created_date || alert.createdAt || new Date().toISOString(),
    updated_date: alert.updated_date || alert.updatedAt,
    creator: alert.creator,
    notes: alert.notes
  };

  // Add livePrice if provided
  if (typeof livePrice === 'number') {
    return { ...normalized, livePrice };
  }

  return normalized;
}

/**
 * Validate that an alert has required fields for trading operations
 */
export function validateTradingAlert(alert: any): boolean {
  return !!(
    alert.id &&
    alert.asset_name &&
    typeof alert.entry_price === 'number' &&
    alert.entry_price > 0 &&
    typeof alert.stop_loss === 'number' &&
    alert.stop_loss > 0 &&
    alert.trade_type &&
    alert.status
  );
}