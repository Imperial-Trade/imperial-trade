
import { UserOwnedEntityDto } from './common';

// Portfolio Item DTOs
export interface PortfolioItemDto extends UserOwnedEntityDto {
  asset_name: string;
  ticker: string;
  asset_type: 'stock' | 'crypto' | 'forex' | 'commodity';
  quantity: number;
  avg_buy_price: number;
}

export interface CreatePortfolioItemDto {
  assetName: string;
  ticker: string;
  assetType: 'stock' | 'crypto' | 'forex' | 'commodity';
  quantity: number;
  avgBuyPrice: number;
}

export interface UpdatePortfolioItemDto {
  quantity?: number;
  avgBuyPrice?: number;
}

// Market Alert DTOs
export interface MarketAlertDto extends UserOwnedEntityDto {
  asset_ticker: string;
  target_price: number;
  condition: 'above' | 'below';
  status: 'active' | 'triggered' | 'cancelled';
}

// Opportunity Signal DTOs
export interface OpportunitySignalDto extends UserOwnedEntityDto {
  instrument: string;
  signal_type: 'bullish' | 'bearish' | 'neutral';
  description: string;
  probability: number;
  time_frame?: string;
  key_levels?: number[];
  status: 'active' | 'expired' | 'closed';
  expiry_date?: string;
}

// Risk Simulation DTOs
export interface RiskSimulationDto extends UserOwnedEntityDto {
  instrument: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  position_size: number;
  risk_reward_ratio?: number;
  simulation_date: string;
  probability_analysis?: string;
}
