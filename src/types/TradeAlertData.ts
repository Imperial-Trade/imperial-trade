
export interface TradeAlertData {
  id: string;
  user_id: string;
  asset_name: string;
  tradermade_symbol: string;
  trade_type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entry_price: number;
  stop_loss: number;
  status: 'pending' | 'active' | 'closed' | 'partially_profited';
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tp_hits: number[];
  notes?: string;
  close_reason?: 'manual' | 'stop_loss' | 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'reversal_after_tp';
  created_date: string;
  updated_date: string;
  creator?: {
    id: string;
    display_name: string;
    role: string;
    avatar_url: string | null;
  };
}
