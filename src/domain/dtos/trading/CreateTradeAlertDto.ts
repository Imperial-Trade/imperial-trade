
export interface CreateTradeAlertDto {
  assetName: string;
  tradermadeSymbol: string;
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entryPrice: number;
  stopLoss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  notes?: string;
}

export interface UpdateTradeAlertDto {
  status?: 'pending' | 'active' | 'closed' | 'partially_profited' | 'cancelled';
  tpHits?: number[];
  closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | 'expired';
  notes?: string;
}

export interface TradeAlertResponseDto {
  id: string;
  userId: string;
  assetName: string;
  tradermadeSymbol: string;
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entryPrice: number;
  stopLoss: number;
  status: 'pending' | 'active' | 'closed' | 'partially_profited' | 'cancelled';
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tpHits: number[];
  notes?: string;
  closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | 'expired';
  createdAt: string;
  updatedAt: string;
}
