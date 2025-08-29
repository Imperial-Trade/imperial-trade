
export type TradeAlertStatus = 'pending' | 'active' | 'closed' | 'partially_profited';

export type TradeAlertCloseReason = 
  | 'manual' 
  | 'stop_loss' 
  | 'tp1' 
  | 'tp2' 
  | 'tp3' 
  | 'tp4' 
  | 'tp5' 
  | 'all_tps_hit' 
  | 'reversal_after_tp' 
  | 'expired';

export type TradeType = 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
