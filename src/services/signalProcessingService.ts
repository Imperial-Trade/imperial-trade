
import { supabase } from '@/integrations/supabase/client';

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
}

export interface SignalFinderResponse {
  status: string;
  asset?: string;
  strategy_name?: string;
  confidence?: string;
  deconstructor_context_note?: string;
  disclaimer?: string;
  message?: string;
}

class SignalProcessingService {
  async scanForEducationalOpportunities(userId: string): Promise<EducationalSignal[]> {
    try {
      console.log('Calling signal-finder-agent for educational opportunities...');
      
      const { data, error } = await supabase.functions.invoke('signal-finder-agent', {
        body: { user_id: userId }
      });

      if (error) {
        console.error('Signal-finder-agent error:', error);
        return this.getFallbackEducationalSignals();
      }

      const response = data?.reply as SignalFinderResponse;
      
      if (!response || response.status === 'NoMatch' || response.status === 'NoWinningPatterns') {
        console.log('No patterns found, using educational examples');
        return this.getFallbackEducationalSignals();
      }

      return this.transformToEducationalSignals(response);
    } catch (error) {
      console.error('Error in signal processing service:', error);
      return this.getFallbackEducationalSignals();
    }
  }

  private transformToEducationalSignals(response: SignalFinderResponse): EducationalSignal[] {
    if (response.status !== 'MatchFound') {
      return this.getFallbackEducationalSignals();
    }

    const baseSignal: EducationalSignal = {
      id: `ai-${Date.now()}`,
      instrument: response.asset || 'Educational Example',
      asset_name: response.asset || 'Educational Asset',
      current_price: this.generateRealisticPrice(response.asset || 'BTC'),
      signal_type: this.extractSignalType(response.strategy_name || ''),
      description: `Educational AI Analysis: ${response.strategy_name} pattern detected`,
      probability: response.confidence === 'High' ? 85 : 70,
      key_levels: this.generateKeyLevels(response.asset || 'BTC'),
      time_frame: '4H',
      entry_trigger: 'Educational analysis based on your historical patterns',
      risk_reward: 2.5,
      status: 'active',
      market: this.getMarketFromAsset(response.asset || 'crypto'),
      strategy: `Educational ${response.strategy_name || 'Pattern Recognition'}`,
      confidence_score: response.confidence === 'High' ? 85 : 70,
      mini_chart: this.getChartEmoji(response.strategy_name || ''),
      rationale: `Educational example: AI detected this pattern matches your historical ${response.strategy_name || 'trading'} success`,
      learning_objective: this.getLearningObjective(response.strategy_name || ''),
      pattern_explanation: this.getPatternExplanation(response.strategy_name || ''),
      risk_education: response.deconstructor_context_note !== 'None' 
        ? `⚠️ Educational Risk Awareness: ${response.deconstructor_context_note}`
        : 'Educational example: Always apply proper risk management principles'
    };

    return [baseSignal];
  }

  private extractSignalType(strategyName: string): string {
    const strategy = strategyName.toLowerCase();
    if (strategy.includes('breakout')) return 'breakout';
    if (strategy.includes('reversal')) return 'reversal';
    if (strategy.includes('momentum')) return 'momentum';
    if (strategy.includes('trend')) return 'pattern';
    return 'pattern';
  }

  private getMarketFromAsset(asset: string): string {
    if (!asset) return 'educational';
    const assetUpper = asset.toUpperCase();
    if (assetUpper.includes('BTC') || assetUpper.includes('ETH') || assetUpper.includes('CRYPTO')) return 'crypto';
    if (assetUpper.includes('EUR') || assetUpper.includes('USD') || assetUpper.includes('GBP')) return 'forex';
    if (assetUpper.includes('GOLD') || assetUpper.includes('OIL') || assetUpper.includes('SILVER')) return 'commodities';
    return 'stocks';
  }

  private generateRealisticPrice(asset: string): number {
    const basePrice = asset.includes('BTC') ? 43000 : 
                     asset.includes('ETH') ? 2800 :
                     asset.includes('EUR') ? 1.08 :
                     asset.includes('GOLD') ? 2050 : 150;
    
    const variation = basePrice * 0.02; // 2% variation
    return Math.round((basePrice + (Math.random() - 0.5) * variation) * 100) / 100;
  }

  private generateKeyLevels(asset: string): number[] {
    const price = this.generateRealisticPrice(asset);
    return [
      Math.round((price * 0.98) * 100) / 100,
      Math.round((price * 0.96) * 100) / 100,
      Math.round((price * 1.04) * 100) / 100
    ];
  }

  private getChartEmoji(strategy: string): string {
    const strategyLower = strategy.toLowerCase();
    if (strategyLower.includes('breakout')) return '📈';
    if (strategyLower.includes('reversal')) return '📊';
    if (strategyLower.includes('momentum')) return '⚡';
    return '📐';
  }

  private getLearningObjective(strategy: string): string {
    const strategyLower = strategy.toLowerCase();
    if (strategyLower.includes('breakout')) return 'Learn to identify volume-confirmed breakout patterns';
    if (strategyLower.includes('reversal')) return 'Understand support/resistance reversal signals';
    if (strategyLower.includes('momentum')) return 'Recognize momentum continuation patterns';
    return 'Study pattern recognition techniques';
  }

  private getPatternExplanation(strategy: string): string {
    const strategyLower = strategy.toLowerCase();
    if (strategyLower.includes('breakout')) return 'This pattern shows price breaking above resistance with increased volume, suggesting strong bullish momentum.';
    if (strategyLower.includes('reversal')) return 'This pattern indicates potential trend reversal at key support/resistance levels with confirmation signals.';
    if (strategyLower.includes('momentum')) return 'This pattern demonstrates strong directional movement with volume confirmation and trend continuation signals.';
    return 'This pattern represents a technical formation that has historically been successful in your trading approach.';
  }

  private getFallbackEducationalSignals(): EducationalSignal[] {
    return [{
      id: 'edu-1',
      instrument: 'Educational Example',
      asset_name: 'Learning Pattern',
      current_price: 245.67,
      signal_type: 'educational',
      description: 'Educational example: Pattern recognition learning opportunity',
      probability: 75,
      key_levels: [240.00, 235.50, 255.00],
      time_frame: '4H',
      entry_trigger: 'Educational analysis: Study this pattern formation',
      risk_reward: 2.5,
      status: 'active',
      market: 'educational',
      strategy: 'Educational Pattern Study',
      confidence_score: 75,
      mini_chart: '📚',
      rationale: 'Educational example for learning pattern recognition principles',
      learning_objective: 'Learn fundamental pattern recognition techniques',
      pattern_explanation: 'This is a basic educational example to demonstrate pattern analysis concepts.',
      risk_education: 'Educational reminder: Always practice proper risk management in real trading'
    }];
  }
}

export const signalProcessingService = new SignalProcessingService();
