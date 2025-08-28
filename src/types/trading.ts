
export interface TradeAlertSubmissionData {
  asset_name: string;
  tradermade_symbol: string;
  trade_type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entry_price: number;
  stop_loss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  notes?: string;
}
