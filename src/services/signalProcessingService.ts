export interface EducationalSignal {
  id: string;
  instrument: string;
  asset_name: string;
  current_price: number;
  signal_type: string;
  description: string;
  probability: number;
  key_levels: number[];
  time_frame: string;
  entry_trigger: string;
  risk_reward: number;
  status: string;
  market: string;
  strategy: string;
  confidence_score: number;
  mini_chart: string;
  rationale: string;
  learning_objective?: string;
  pattern_explanation?: string;
  risk_education?: string;
  entry_level?: number;
  stop_loss?: number;
  target_1?: number;
  target_2?: number;
  technical_confluence?: string;
  volume_analysis?: string;
  market_context?: string;
  risk_factors?: string;
  asset_class?: string;
  data_quality?: string;
}

export interface EnhancedSignalFinderResponse {
  status: string;
  signals?: Array<{
    status: string;
    asset?: string;
    pattern_type?: string;
    strategy_name?: string;
    confidence?: string;
    entry_level?: number;
    stop_loss?: number;
    target_1?: number;
    target_2?: number;
    risk_reward_ratio?: number;
    timeframe?: string;
    technical_confluence?: string;
    volume_analysis?: string;
    market_context?: string;
    pattern_explanation?: string;
    risk_factors?: string;
    educational_note?: string;
    asset_class?: string;
  }>;
  totalAnalyzed?: number;
  assetClassBreakdown?: Record<string, number>;
  message?: string;
  reason?: string;
}

class SignalProcessingService {
  async scanForEducationalOpportunities(userId: string): Promise<EducationalSignal[]> {
    console.log('Educational Pattern Scanner is coming soon', { userId });
    // No AI API calls or signal processing - feature disabled
    return [];
  }
}

export const signalProcessingService = new SignalProcessingService();