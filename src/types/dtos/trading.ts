
import { BaseEntityDto, UserOwnedEntityDto } from './common';

// Trade Alert DTOs
export interface TradeAlertDto extends UserOwnedEntityDto {
  asset_name: string;
  finnhub_symbol: string;
  trade_type: 'buy' | 'sell';
  entry_price: number;
  stop_loss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  status: 'active' | 'pending' | 'closed';
  tp_hits?: number[];
  close_reason?: string;
  notes?: string;
}

export interface CreateTradeAlertDto {
  assetName: string;
  finnhubSymbol: string;
  tradeType: 'buy' | 'sell';
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
  status?: 'active' | 'pending' | 'closed';
  tpHits?: number[];
  closeReason?: string;
  notes?: string;
}

// Trade Journal Entry DTOs
export interface TradeJournalEntryDto extends UserOwnedEntityDto {
  asset_ticker: string;
  trade_date: string;
  trade_type?: 'buy' | 'sell';
  entry_price?: number;
  exit_price?: number;
  position_size?: number;
  pnl: number;
  notes?: string;
  screenshot_url?: string;
  ai_positive_feedback?: string;
}

// Trading Strategy DTOs
export interface TradingStrategyDto extends UserOwnedEntityDto {
  strategy_name: string;
  description: string;
  rules: Record<string, unknown>;
  indicators?: string[];
  is_public: boolean;
  likes: number;
  created_by: string;
  backtest_results?: Record<string, unknown>;
}

// Trading Group DTOs
export interface TradingGroupDto extends BaseEntityDto {
  group_name: string;
  description?: string;
  created_by: string;
  is_private: boolean;
  max_members: number;
  current_members: number;
  invite_code?: string;
}

// Group Journal Entry DTOs
export interface GroupJournalEntryDto extends UserOwnedEntityDto {
  group_id: string;
  trade_entry_id: string;
  shared_date: string;
  shared_notes?: string;
  comments?: Array<Record<string, unknown>>;
}

// Verified Trader DTOs
export interface VerifiedTraderDto extends UserOwnedEntityDto {
  trader_name: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_date?: string;
  total_pnl: number;
  win_rate: number;
  trade_count: number;
  risk_score: number;
  rank_position?: number;
  vt_account_linked: boolean;
}

// Trade History DTOs
export interface TradeHistoryDto extends UserOwnedEntityDto {
  file_url: string;
  upload_date: string;
  status: 'pending' | 'processed' | 'failed';
  analysis_result?: string;
}
