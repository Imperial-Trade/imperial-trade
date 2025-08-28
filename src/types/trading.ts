
export interface TradeAlertWithProfile {
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
  closeReason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'reversal_after_tp' | 'all_tps_hit';
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  activationPrice?: number;
  creator?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url?: string | null;
    user_type?: string | null;
    access_level?: string | null;
  };
}
