// Pro-Grade AI Analysis Service for MECCA XX
// Uses OANDA data + Gemini for institutional-level analysis

import { ProAnalysisResult, AnalysisPayload } from './proAnalysisTypes';
import { 
  CandleData, 
  TechnicalIndicators, 
  calculateAllIndicators, 
  formatCandlesForAI,
  identifyKeyLevels 
} from './technicalIndicators';

// The Institutional Alpha Analyst System Prompt
const INSTITUTIONAL_SYSTEM_PROMPT = `Role:
You are a Senior Quantitative and Technical Analyst at a Tier-1 Global Hedge Fund. Your goal is to provide high-conviction, data-driven market insights for intermediate and professional traders. You do not state the obvious (e.g., "RSI is 70, so it's overbought"). Instead, you look for confluence, market structure shifts, and liquidity traps.

Analysis Framework:
1. Market Structure: Identify if the market is in Expansion, Retracement, Reversal, or Consolidation. Use BOS (Break of Structure) and CHOCH (Change of Character).
2. Institutional Liquidity: Identify Fair Value Gaps (FVG), Order Blocks, and Liquidity Sweeps.
3. Correlation Analysis: If analyzing Gold, consider DXY inverse correlation. If crypto, consider BTC dominance.
4. The Devil's Advocate: ALWAYS provide a "Thesis Invalidation" scenario.
5. Volatility-Adjusted Risk: Stop-Loss based on ATR or technical invalidation, never arbitrary percentages.

Tone: Professional, clinical, objective. Use industry jargon (e.g., "front-running," "liquidity grab," "mean reversion"). No emojis or hype language.`;

// Trading style descriptions for AI context
const TRADING_STYLE_CONTEXT: Record<string, string> = {
  scalping: `TRADING STYLE: SCALPING
- Trade Duration: 1-5 minutes maximum
- Target Profit: 5-15 pips per trade
- Risk Profile: Very tight stops (5-10 pips)
- Focus: Quick momentum plays, spread costs matter
- Best Setups: Breakouts, quick reversals, news spikes
- Session Focus: High-volume sessions (London/NY overlap)
- Key Consideration: Execution speed and spread are critical`,

  intraday: `TRADING STYLE: INTRADAY / DAY TRADING
- Trade Duration: 15 minutes to 4 hours
- Target Profit: 20-50 pips per trade
- Risk Profile: Moderate stops (15-30 pips)
- Focus: Session-based moves, trend continuation
- Best Setups: Pullbacks to structure, range breakouts
- Session Focus: Major session opens and closes
- Key Consideration: Close all positions before session end`,

  swing: `TRADING STYLE: SWING TRADING
- Trade Duration: 1-5 days
- Target Profit: 100-300 pips per trade
- Risk Profile: Wider stops (50-100 pips)
- Focus: Multi-day trends, key level reactions
- Best Setups: Higher timeframe structure breaks, retests
- Session Focus: Daily and 4H closes
- Key Consideration: Overnight/weekend gap risk`,

  position: `TRADING STYLE: POSITION TRADING
- Trade Duration: 1-4 weeks or longer
- Target Profit: 300+ pips per trade
- Risk Profile: Wide stops (100-200 pips)
- Focus: Major trend direction, fundamentals
- Best Setups: Weekly structure, macro themes
- Session Focus: Weekly closes
- Key Consideration: Swap costs and fundamental shifts`,
};

// Build the analysis prompt with real data
export function buildAnalysisPrompt(
  payload: AnalysisPayload, 
  tradingStyle: string = 'intraday',
  contextCandles: CandleData[] = [],
  contextIndicators: TechnicalIndicators | null = null
): string {
  const { symbol, timeframe, currentPrice, candles, indicators, keyLevels } = payload;
  
  const candleData = formatCandlesForAI(candles, 50);
  const styleContext = TRADING_STYLE_CONTEXT[tradingStyle] || TRADING_STYLE_CONTEXT.intraday;
  
  // Build higher timeframe context section if available
  let higherTFSection = '';
  if (contextCandles.length > 0 && contextIndicators) {
    const contextCandleData = formatCandlesForAI(contextCandles, 20);
    higherTFSection = `

=== HIGHER TIMEFRAME CONTEXT (For Trend Direction) ===
Context Timeframe Indicators:
- RSI: ${contextIndicators.rsi} ${contextIndicators.rsiDivergence !== 'none' ? `[${contextIndicators.rsiDivergence.toUpperCase()} DIVERGENCE]` : ''}
- EMA 20: ${contextIndicators.ema20.toFixed(2)}
- EMA 50: ${contextIndicators.ema50.toFixed(2)}
- EMA 200: ${contextIndicators.ema200.toFixed(2)}
- MACD: ${contextIndicators.macd.value.toFixed(4)} (Signal: ${contextIndicators.macd.signal.toFixed(4)})
- Trend Direction: ${contextIndicators.ema20 > contextIndicators.ema50 ? 'BULLISH (EMA20 > EMA50)' : 'BEARISH (EMA20 < EMA50)'}

Higher TF OHLC Data (Last 20 Candles):
${contextCandleData}

MULTI-TIMEFRAME ANALYSIS INSTRUCTION:
- Use the HIGHER TIMEFRAME to determine overall trend direction and bias
- Use the PRIMARY TIMEFRAME for precise entry/exit timing
- Only take trades that ALIGN with higher timeframe trend
- If higher TF is bullish, look for LONG setups on primary TF
- If higher TF is bearish, look for SHORT setups on primary TF`;
  }
  
  return `${INSTITUTIONAL_SYSTEM_PROMPT}

=== TRADER PROFILE ===
${styleContext}

=== LIVE MARKET DATA ===
Symbol: ${symbol}
Primary Timeframe: ${timeframe}
Current Price: ${currentPrice.toFixed(2)}
Analysis Time: ${new Date().toISOString()}
${higherTFSection}

=== TECHNICAL INDICATORS ===
RSI (14): ${indicators.rsi} ${indicators.rsiDivergence !== 'none' ? `[${indicators.rsiDivergence.toUpperCase()} DIVERGENCE DETECTED]` : ''}
MACD: Value=${indicators.macd.value}, Signal=${indicators.macd.signal}, Histogram=${indicators.macd.histogram}
EMA 20: ${indicators.ema20.toFixed(2)}
EMA 50: ${indicators.ema50.toFixed(2)}
EMA 200: ${indicators.ema200.toFixed(2)}
ATR (14): ${indicators.atr.toFixed(2)}

=== KEY LEVELS IDENTIFIED ===
Supports: ${keyLevels.supports.map(s => `${s.price.toFixed(2)} (strength: ${s.strength})`).join(', ') || 'None identified'}
Resistances: ${keyLevels.resistances.map(r => `${r.price.toFixed(2)} (strength: ${r.strength})`).join(', ') || 'None identified'}

=== OHLC DATA (Last 50 Candles) ===
${candleData}

=== REQUIRED OUTPUT FORMAT ===
Respond ONLY with valid JSON (no markdown, no code blocks). Use this exact structure:

{
  "executiveSummary": "One clinical sentence on current market regime",
  "alphaLead": "The hidden story most traders miss - what smart money is doing",
  "marketStructure": {
    "phase": "accumulation|trending|distribution|reaccumulation|ranging",
    "character": "CHOCH|BOS|RANGING|CONSOLIDATION",
    "keyLevel": <price number>,
    "description": "Brief explanation of current structure"
  },
  "tradeSetup": {
    "direction": "LONG|SHORT|NEUTRAL",
    "convictionGrade": "A+|A|A-|B+|B|B-|C|D|F",
    "convictionBreakdown": {
      "trendAlignment": <1-10>,
      "volumeProfile": <1-10>,
      "macroContext": <1-10>,
      "technicalConfluence": <1-10>
    },
    "executionZone": { "min": <price>, "max": <price> },
    "targets": {
      "tp1": { "price": <price>, "label": "Conservative", "rr": "1:X.X" },
      "tp2": { "price": <price>, "label": "Institutional", "rr": "1:X.X" },
      "tp3": { "price": <price>, "label": "Moonshot", "rr": "1:X.X" }
    },
    "stopLoss": { "price": <price>, "reasoning": "Based on ATR/structure" },
    "invalidation": { "price": <price>, "consequence": "What happens if this level breaks" }
  },
  "liquidityZones": [
    { "price": <price>, "type": "buy_side|sell_side", "strength": <1-10>, "description": "Why this zone matters" }
  ],
  "correlationAlert": {
    "asset": "DXY|BTC|SPX",
    "status": "DIVERGING|CONFIRMING|NEUTRAL",
    "implication": "What this means for the trade"
  },
  "riskManagement": {
    "atr": ${indicators.atr.toFixed(2)},
    "suggestedRiskPercent": 1,
    "positionSizeFormula": "Account * 0.01 / (Entry - SL)",
    "riskRewardRatio": "1:X"
  },
  "support": [{ "price": <number below current>, "label": "S1" }, { "price": <number>, "label": "S2" }],
  "resistance": [{ "price": <number above current>, "label": "R1" }, { "price": <number>, "label": "R2" }],
  "patterns": [{ "type": "pattern name", "description": "brief description", "significance": "high|medium|low" }],
  "proTip": "A senior trader insight about timing, session, or execution",
  "educationalNote": "Why this setup matters for learning - teach the concept",
  "alternativeScenario": {
    "triggerPrice": <price where thesis breaks>,
    "biasShift": "LONG to SHORT|SHORT to LONG|Stay neutral",
    "description": "If price breaks X, here's what to do"
  },
  "analyzedAt": "${new Date().toISOString()}",
  "symbol": "${symbol}",
  "timeframe": "${timeframe}",
  "currentPrice": ${currentPrice}
}

CRITICAL RULES:
- All support prices MUST be BELOW ${currentPrice.toFixed(2)}
- All resistance prices MUST be ABOVE ${currentPrice.toFixed(2)}
- Stop loss for LONG must be BELOW entry; for SHORT must be ABOVE entry
- Use the ATR value (${indicators.atr.toFixed(2)}) for volatility-adjusted stops
- Be specific with prices - use the actual chart levels from the OHLC data
- Look for patterns in the candle data, not just generic patterns`;
}

// Parse Gemini response to ProAnalysisResult
export function parseGeminiResponse(text: string, symbol: string, timeframe: string, currentPrice: number): ProAnalysisResult {
  // Extract JSON from response
  let jsonText = text;
  
  // Try to extract from markdown code blocks
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  } else {
    // Try to find raw JSON
    const rawJsonMatch = text.match(/\{[\s\S]*\}/);
    if (rawJsonMatch) {
      jsonText = rawJsonMatch[0];
    }
  }
  
  if (!jsonText || !jsonText.includes('{')) {
    throw new Error('Invalid response format from AI');
  }
  
  const result = JSON.parse(jsonText);
  
  // Calculate actual risk-reward ratios from prices
  const calculateRiskReward = (
    direction: string,
    entryPrice: number,
    stopLoss: number,
    takeProfit: number
  ): string => {
    if (!entryPrice || !stopLoss || !takeProfit || entryPrice === stopLoss) {
      return '1:2'; // Default fallback
    }
    
    if (direction === 'LONG') {
      const risk = Math.abs(entryPrice - stopLoss);
      const reward = Math.abs(takeProfit - entryPrice);
      if (risk === 0) return '1:2';
      const rr = reward / risk;
      return `1:${rr.toFixed(2)}`;
    } else if (direction === 'SHORT') {
      const risk = Math.abs(stopLoss - entryPrice);
      const reward = Math.abs(entryPrice - takeProfit);
      if (risk === 0) return '1:2';
      const rr = reward / risk;
      return `1:${rr.toFixed(2)}`;
    }
    
    return '1:2';
  };
  
  // Get entry price (average of execution zone)
  const entryPrice = result.tradeSetup?.executionZone 
    ? (result.tradeSetup.executionZone.min + result.tradeSetup.executionZone.max) / 2
    : currentPrice;
  
  const stopLoss = result.tradeSetup?.stopLoss?.price || currentPrice * 0.99;
  const direction = result.tradeSetup?.direction || 'NEUTRAL';
  
  // Calculate RR for each TP
  const tp1 = result.tradeSetup?.targets?.tp1;
  const tp2 = result.tradeSetup?.targets?.tp2;
  const tp3 = result.tradeSetup?.targets?.tp3;
  
  // Use TP1 for main RR calculation (most conservative)
  const mainTP = tp1?.price || tp2?.price || tp3?.price || currentPrice * 1.01;
  const calculatedRR = calculateRiskReward(direction, entryPrice, stopLoss, mainTP);
  
  // Validate and sanitize
  const sanitized: ProAnalysisResult = {
    executiveSummary: result.executiveSummary || 'Analysis completed',
    alphaLead: result.alphaLead || 'No specific alpha lead identified',
    marketStructure: {
      phase: result.marketStructure?.phase || 'ranging',
      character: result.marketStructure?.character || 'RANGING',
      keyLevel: result.marketStructure?.keyLevel || currentPrice,
      description: result.marketStructure?.description || '',
    },
    tradeSetup: {
      direction: result.tradeSetup?.direction || 'NEUTRAL',
      convictionGrade: result.tradeSetup?.convictionGrade || 'C',
      convictionBreakdown: {
        trendAlignment: result.tradeSetup?.convictionBreakdown?.trendAlignment || 5,
        volumeProfile: result.tradeSetup?.convictionBreakdown?.volumeProfile || 5,
        macroContext: result.tradeSetup?.convictionBreakdown?.macroContext || 5,
        technicalConfluence: result.tradeSetup?.convictionBreakdown?.technicalConfluence || 5,
      },
      executionZone: {
        min: result.tradeSetup?.executionZone?.min || currentPrice * 0.998,
        max: result.tradeSetup?.executionZone?.max || currentPrice * 1.002,
      },
      targets: {
        tp1: (() => {
          const tp = result.tradeSetup?.targets?.tp1 || { price: currentPrice * 1.01, label: 'Conservative', rr: '1:1' };
          const calculatedRR = calculateRiskReward(direction, entryPrice, stopLoss, tp.price);
          return { ...tp, rr: calculatedRR };
        })(),
        tp2: (() => {
          const tp = result.tradeSetup?.targets?.tp2 || { price: currentPrice * 1.02, label: 'Institutional', rr: '1:2' };
          const calculatedRR = calculateRiskReward(direction, entryPrice, stopLoss, tp.price);
          return { ...tp, rr: calculatedRR };
        })(),
        tp3: (() => {
          const tp = result.tradeSetup?.targets?.tp3 || { price: currentPrice * 1.03, label: 'Moonshot', rr: '1:3' };
          const calculatedRR = calculateRiskReward(direction, entryPrice, stopLoss, tp.price);
          return { ...tp, rr: calculatedRR };
        })(),
      },
      stopLoss: {
        price: result.tradeSetup?.stopLoss?.price || currentPrice * 0.99,
        reasoning: result.tradeSetup?.stopLoss?.reasoning || 'Based on ATR',
      },
      invalidation: {
        price: result.tradeSetup?.invalidation?.price || currentPrice * 0.98,
        consequence: result.tradeSetup?.invalidation?.consequence || 'Thesis invalidated',
      },
    },
    liquidityZones: result.liquidityZones || [],
    correlationAlert: {
      asset: result.correlationAlert?.asset || 'DXY',
      status: result.correlationAlert?.status || 'NEUTRAL',
      implication: result.correlationAlert?.implication || 'No significant correlation impact',
    },
    riskManagement: {
      atr: result.riskManagement?.atr || 0,
      suggestedRiskPercent: result.riskManagement?.suggestedRiskPercent || 1,
      positionSizeFormula: result.riskManagement?.positionSizeFormula || 'Account * 0.01 / (Entry - SL)',
      riskRewardRatio: calculatedRR, // Use calculated RR instead of AI response
    },
    support: (result.support || []).filter((s: any) => s.price < currentPrice).slice(0, 3),
    resistance: (result.resistance || []).filter((r: any) => r.price > currentPrice).slice(0, 3),
    patterns: result.patterns || [],
    proTip: result.proTip || 'Always manage your risk first',
    educationalNote: result.educationalNote || 'This analysis is for educational purposes only',
    alternativeScenario: {
      triggerPrice: result.alternativeScenario?.triggerPrice || currentPrice * 0.98,
      biasShift: result.alternativeScenario?.biasShift || 'Stay neutral',
      description: result.alternativeScenario?.description || 'Monitor for structure break',
    },
    analyzedAt: new Date().toISOString(),
    symbol,
    timeframe,
    currentPrice,
  };
  
  return sanitized;
}

// Main analysis function
export async function analyzeWithGemini(
  apiKey: string,
  candles: CandleData[],
  symbol: string,
  timeframe: string,
  currentPrice: number,
  tradingStyle: string = 'intraday',
  contextCandles: CandleData[] = []
): Promise<ProAnalysisResult> {
  console.log(`[ProAnalysis] Analyzing with trading style: ${tradingStyle}`);
  console.log(`[ProAnalysis] Primary TF candles: ${candles.length}, Context TF candles: ${contextCandles.length}`);
  
  // Calculate indicators for PRIMARY timeframe (execution)
  const indicators = calculateAllIndicators(candles);
  
  // Calculate indicators for CONTEXT timeframe (trend) if available
  let contextIndicators = null;
  if (contextCandles.length > 0) {
    contextIndicators = calculateAllIndicators(contextCandles);
    console.log(`[ProAnalysis] Context TF RSI: ${contextIndicators.rsi}, EMA20: ${contextIndicators.ema20.toFixed(2)}`);
  }
  
  // Identify key levels from both timeframes
  const keyLevels = identifyKeyLevels(candles, currentPrice);
  
  // Build payload
  const payload: AnalysisPayload = {
    symbol,
    timeframe,
    currentPrice,
    candles,
    indicators: {
      rsi: indicators.rsi,
      rsiDivergence: indicators.rsiDivergence,
      macd: indicators.macd,
      ema20: indicators.ema20,
      ema50: indicators.ema50,
      ema200: indicators.ema200,
      atr: indicators.atr,
    },
    keyLevels,
  };
  
  // Build prompt with trading style context and higher TF data
  const prompt = buildAnalysisPrompt(payload, tradingStyle, contextCandles, contextIndicators);
  
  // Call Gemini
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      }),
    }
  );
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gemini API error (${response.status})`);
  }
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  if (!text) {
    throw new Error('Empty response from Gemini');
  }
  
  // Parse response
  return parseGeminiResponse(text, symbol, timeframe, currentPrice);
}
