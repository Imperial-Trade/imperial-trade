
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
  status?: 'pending' | 'active' | 'closed' | 'partially_profited';
  tpHits?: number[];
  closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | 'expired';
  notes?: string;
  // ============================================
  // PHASE 5: RACE CONDITION PROTECTION
  // ============================================
  expectedVersion?: string; // ISO timestamp of expected updated_at for optimistic locking
}

// ✅ Sanitized DTO for database operations - explicitly excludes is_xeon_stream
export interface SanitizedUpdateTradeAlertDto {
  status?: 'pending' | 'active' | 'closed' | 'partially_profited';
  tpHits?: number[];
  closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'all_tps_hit' | 'reversal_after_tp' | 'expired';
  notes?: string;
  // ❌ is_xeon_stream explicitly excluded from sanitized DTO
}

export interface TradeAlertResponseDto {
  id: string;
  userId: string;
  assetName: string;
  tradermadeSymbol: string;
  tradeType: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entryPrice: number;
  stopLoss: number;
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
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
