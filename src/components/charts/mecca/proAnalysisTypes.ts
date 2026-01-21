// Pro-Grade AI Analysis Types for MECCA XX

export interface ProAnalysisResult {
  // Executive Summary
  executiveSummary: string;
  alphaLead: string; // The hidden story most traders miss
  
  // Market Structure (ICT Concepts)
  marketStructure: {
    phase: 'accumulation' | 'trending' | 'distribution' | 'reaccumulation' | 'ranging';
    character: 'CHOCH' | 'BOS' | 'RANGING' | 'CONSOLIDATION';
    keyLevel: number;
    description: string;
  };
  
  // Trade Setup
  tradeSetup: {
    direction: 'LONG' | 'SHORT' | 'NEUTRAL';
    convictionGrade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C' | 'D' | 'F';
    convictionBreakdown: {
      trendAlignment: number; // 1-10
      volumeProfile: number; // 1-10
      macroContext: number; // 1-10
      technicalConfluence: number; // 1-10
    };
    executionZone: {
      min: number;
      max: number;
    };
    targets: {
      tp1: { price: number; label: string; rr: string };
      tp2: { price: number; label: string; rr: string };
      tp3: { price: number; label: string; rr: string };
    };
    stopLoss: {
      price: number;
      reasoning: string;
    };
    invalidation: {
      price: number;
      consequence: string;
    };
  };
  
  // Liquidity Zones (Smart Money Concepts)
  liquidityZones: {
    price: number;
    type: 'buy_side' | 'sell_side';
    strength: number; // 1-10
    description: string;
  }[];
  
  // Correlation Analysis
  correlationAlert: {
    asset: string;
    status: 'DIVERGING' | 'CONFIRMING' | 'NEUTRAL';
    implication: string;
  };
  
  // Risk Management
  riskManagement: {
    atr: number;
    suggestedRiskPercent: number;
    positionSizeFormula: string;
    riskRewardRatio: string;
  };
  
  // Support & Resistance (Classic)
  support: { price: number; label: string }[];
  resistance: { price: number; label: string }[];
  
  // Patterns Detected
  patterns: {
    type: string;
    description: string;
    significance: 'high' | 'medium' | 'low';
  }[];
  
  // Pro Tips
  proTip: string;
  educationalNote: string;
  
  // Devil's Advocate (Alternative Scenario)
  alternativeScenario: {
    triggerPrice: number;
    biasShift: string;
    description: string;
  };
  
  // Metadata
  analyzedAt: string;
  symbol: string;
  timeframe: string;
  currentPrice: number;
}

// Simplified version for backward compatibility
export interface BasicAnalysisResult {
  insight: string;
  support: { price: number; label: string }[];
  resistance: { price: number; label: string }[];
  patterns: { type: string; description: string }[];
  bias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

// Convert ProAnalysisResult to BasicAnalysisResult for legacy components
export function toBasicAnalysis(pro: ProAnalysisResult): BasicAnalysisResult {
  const directionToBias = (dir: string): 'bullish' | 'bearish' | 'neutral' => {
    if (dir === 'LONG') return 'bullish';
    if (dir === 'SHORT') return 'bearish';
    return 'neutral';
  };
  
  const gradeToConfidence = (grade: string): number => {
    const grades: Record<string, number> = {
      'A+': 95, 'A': 90, 'A-': 85,
      'B+': 80, 'B': 75, 'B-': 70,
      'C': 60, 'D': 50, 'F': 30,
    };
    return grades[grade] || 50;
  };
  
  return {
    insight: pro.executiveSummary,
    support: pro.support,
    resistance: pro.resistance,
    patterns: pro.patterns.map(p => ({ type: p.type, description: p.description })),
    bias: directionToBias(pro.tradeSetup.direction),
    confidence: gradeToConfidence(pro.tradeSetup.convictionGrade),
  };
}

// Analysis request payload
export interface AnalysisPayload {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  candles: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  indicators: {
    rsi: number;
    rsiDivergence: 'bullish' | 'bearish' | 'none';
    macd: { value: number; signal: number; histogram: number };
    ema20: number;
    ema50: number;
    ema200: number;
    atr: number;
  };
  keyLevels: {
    supports: { price: number; strength: number }[];
    resistances: { price: number; strength: number }[];
  };
}
