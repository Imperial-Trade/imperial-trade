export interface TradeEntry {
  id: string;
  date: string;
  asset: string;
  pnl: number;
  notes: string;
  imageUrl?: string; // Base64 for display (first image, for backward compatibility)
  imageUrls?: string[]; // Array of image URLs (supports up to 3 images)
  aiFeedback?: string;
  // Pro Fields
  direction?: 'Long' | 'Short';
  outcome?: 'Win' | 'Loss' | 'Break Even';
  strategy?: string;
  emotion?: string;
  session?: string;
  ai_rating?: 'A' | 'B' | 'C' | 'F';
  createdAt?: string; // For sorting same-day trades correctly
  followedPlan?: boolean;
  exit_price?: number;
  entry_price?: number;
  position_size?: number;
  // AI-extracted/analyzed fields for God Mode Trader DNA
  target_hit_by_market?: boolean; // AI-analyzed: Whether market price reached planned_target_price
  planned_target_price?: number; // AI-extracted: Take profit price from trading screenshot
  planned_stop_loss?: number; // AI-extracted: Stop loss price from trading screenshot
  revenge_trade?: boolean; // Testing flag: Marks trade as revenge trade for Patience calculation
  is_synced?: boolean; // Whether trade was synced from broker (true) or manually entered (false)
  broker_connection_id?: string; // ID of broker connection if synced
  entry_time?: string; // ISO string for entry time (for auto journal trades)
  exit_time?: string; // ISO string for exit time (for auto journal trades)
}

export interface ExtractedTradeDetails {
  exit_price: number | null;
  entry_price: number | null;
  position_size: number | null;
  stop_loss: number | null; // AI-extracted: Will be stored as planned_stop_loss
  take_profit: number | null; // AI-extracted: Will be stored as planned_target_price
  actual_outcome: 'win' | 'loss' | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface TradeFormData {
  date: string; // YYYY-MM-DD
  asset: string;
  pnl: string; // Keep as string for input handling
  notes: string;
  image: File | null;
  // Pro Fields
  direction?: 'Long' | 'Short';
  outcome?: 'Win' | 'Loss' | 'Break Even';
  strategy?: string;
  emotion?: string;
  session?: string;
  followedPlan?: boolean;
  // Extended / form-passed
  imageUrls?: string[];
  entryPrice?: number;
  exitPrice?: number;
  positionSize?: number;
  plannedTargetPrice?: number;
  plannedStopLoss?: number;
  revengeTrade?: boolean;
  targetHitByMarket?: boolean;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

