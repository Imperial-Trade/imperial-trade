
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAI } from "../_shared/google-ai-helper.ts";

interface SignalFinderRequest {
  user_id: string;
}

interface MarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
  technicalIndicators?: {
    rsi?: number;
    macd?: number;
    ma20?: number;
    ma50?: number;
    bollingerUpper?: number;
    bollingerLower?: number;
    support?: number;
    resistance?: number;
  };
  marketContext?: {
    trend: 'bullish' | 'bearish' | 'sideways';
    volatility: 'low' | 'medium' | 'high';
    volume_profile: 'above_average' | 'below_average' | 'normal';
  };
}

const ENHANCED_SYSTEM_PROMPT = `You are "Orion," an advanced AI trading pattern analyst specializing in real-time technical analysis. Your expertise lies in identifying high-probability trading opportunities by analyzing live market data, technical indicators, and chart patterns.

**Core Analysis Framework:**
1. **Technical Pattern Recognition**: Identify classic patterns (breakouts, reversals, triangles, flags, head & shoulders, double tops/bottoms)
2. **Multi-Indicator Confluence**: Analyze RSI, MACD, Moving Averages, Bollinger Bands for signal confirmation
3. **Volume Analysis**: Assess volume profiles and their relationship to price action
4. **Market Context**: Consider overall market trend, volatility, and sector performance
5. **Risk Assessment**: Evaluate risk-reward ratios and position sizing recommendations

**Live Market Data Analysis:**
- Current price action and momentum
- Technical indicator readings and divergences
- Support and resistance levels
- Volume confirmation patterns
- Market volatility and trend strength

**Pattern Identification Criteria:**
- **Breakout Patterns**: Price breaking above/below key levels with volume confirmation
- **Reversal Patterns**: Price action at support/resistance with indicator divergence
- **Momentum Patterns**: Strong directional moves with technical confirmation
- **Consolidation Patterns**: Range-bound price action approaching breakout levels

**Response Format (JSON ONLY):**
For REAL trading opportunities found in live market data:
{
  "status": "MatchFound",
  "asset": "[Exact Symbol from Market Data]",
  "pattern_type": "[breakout|reversal|momentum|consolidation]",
  "strategy_name": "[Descriptive Pattern Name]",
  "confidence": "High|Medium",
  "entry_level": [Specific Price Level],
  "stop_loss": [Risk Management Level],
  "target_1": [First Take Profit],
  "target_2": [Second Take Profit],
  "risk_reward_ratio": [Calculated R:R],
  "timeframe": "[1H|4H|1D]",
  "technical_confluence": "[List of confirming indicators]",
  "volume_analysis": "[Volume pattern description]",
  "market_context": "[Current market environment]",
  "pattern_explanation": "[Why this pattern is forming]",
  "risk_factors": "[Potential risks to consider]",
  "educational_note": "[Learning opportunity explanation]"
}

If NO high-probability patterns found:
{"status": "NoMatch", "reason": "Insufficient technical confluence for reliable signals"}

**Critical Rules:**
- Only analyze REAL market data provided
- Require multiple technical confirmations for "High" confidence
- Always include proper risk management levels
- Focus on educational value while maintaining accuracy
- Never guarantee outcomes - emphasize probability and risk management`;

async function getWinningPatterns(supabase: SupabaseClient, userId: string): Promise<any[]> {
  const { data: trades, error } = await supabase
    .from("trade_journal_entries")
    .select("notes, entry_price, exit_price, pnl, instrument")
    .eq("user_id", userId)
    .not("exit_price", "is", null);

  if (error) throw error;
  if (!trades) return [];

  const strategies = trades.reduce((acc, trade) => {
    const strategy = extractStrategyFromNotes(trade.notes) || "Pattern Trading";
    if (!acc[strategy]) {
      acc[strategy] = { wins: 0, losses: 0, instruments: new Set() };
    }
    if (trade.pnl > 0) {
      acc[strategy].wins++;
    } else {
      acc[strategy].losses++;
    }
    acc[strategy].instruments.add(trade.instrument);
    return acc;
  }, {} as Record<string, { wins: number; losses: number; instruments: Set<string> }>);

  return Object.entries(strategies)
    .filter(([, stats]) => stats.wins > stats.losses && stats.wins >= 2)
    .map(([name, stats]) => ({
      strategy_name: name,
      win_rate: (stats.wins / (stats.wins + stats.losses) * 100).toFixed(1),
      total_trades: stats.wins + stats.losses,
      preferred_instruments: Array.from(stats.instruments)
    }));
}

function extractStrategyFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  
  const strategies = [
    'breakout', 'reversal', 'momentum', 'scalp', 'swing', 
    'trend following', 'support resistance', 'pattern trading',
    'technical analysis', 'price action'
  ];
  
  for (const strategy of strategies) {
    if (notes.toLowerCase().includes(strategy)) {
      return strategy.charAt(0).toUpperCase() + strategy.slice(1);
    }
  }
  return null;
}

async function fetchLiveMarketData(supabase: SupabaseClient): Promise<MarketDataPoint[]> {
  try {
    console.log("Fetching live market data with technical indicators...");
    
    const symbols = ['TSLA', 'BTC/USD', 'GOLD', 'EUR/USD', 'SPY', 'AAPL', 'NVDA', 'MSFT'];
    
    const { data, error } = await supabase.functions.invoke('get-market-data', {
      body: { 
        symbols,
        includeVolume: true,
        includeTechnicals: true
      }
    });

    if (error) {
      console.error("Market data fetch error:", error);
      return [];
    }

    const marketData = data?.prices || [];
    console.log(`Fetched live data for ${marketData.length} instruments with technical indicators`);
    
    return marketData;
  } catch (error) {
    console.error("Failed to fetch live market data:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables.");
    }

    const { user_id }: SignalFinderRequest = await req.json();
    if (!user_id) throw new Error("user_id is required.");

    console.log("Enhanced Signal Finder Agent - Processing request for user:", user_id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile
    console.log("Fetching user profile...");
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("real_name, display_name")
      .eq("id", user_id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      throw new Error("Failed to fetch user profile information");
    }

    const userName = userProfile?.display_name || userProfile?.real_name || "Trader";
    console.log("User name resolved:", userName);

    // Get user's winning patterns
    const winningPatterns = await getWinningPatterns(supabase, user_id);
    console.log("User winning patterns:", winningPatterns.length);

    // Fetch latest Deconstructor analysis
    const { data: latestAnalysis } = await supabase
      .from("agent_outputs")
      .select("output_text, user_readable_text")
      .eq("user_id", user_id)
      .eq("agent_name", "Deconstructor")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Fetch live market data with technical indicators
    console.log("Fetching live market data...");
    const liveMarketData = await fetchLiveMarketData(supabase);
    
    if (liveMarketData.length === 0) {
      return new Response(
        JSON.stringify({ reply: { status: "NoMarketData", message: "Unable to fetch live market data" } }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare comprehensive analysis prompt
    const analysisPrompt = `
**LIVE MARKET DATA ANALYSIS REQUEST**

**User Trading Profile:**
- Trader: ${userName}
- Winning Patterns: ${JSON.stringify(winningPatterns, null, 2)}
- Recent Behavioral Analysis: ${latestAnalysis?.output_text || "No recent analysis available"}

**REAL-TIME MARKET DATA:**
${JSON.stringify(liveMarketData, null, 2)}

**ANALYSIS REQUIREMENTS:**
1. Analyze the live market data for high-probability trading patterns
2. Look for technical confluences across multiple indicators
3. Consider the user's historical success patterns when evaluating opportunities
4. Assess current market volatility and trend strength
5. Identify patterns that align with the user's proven strategies

**FOCUS AREAS:**
- Technical pattern formations (breakouts, reversals, consolidations)
- Multi-timeframe confirmation signals
- Volume and momentum analysis
- Support/resistance level interactions
- Risk-reward optimization opportunities

Provide a detailed technical analysis identifying the BEST trading opportunity from the current live market data.
`;

    const modelName = "gemini-2.5-pro";

    console.log("Generating enhanced market analysis with Gemini AI...");
    const aiResponse = await callGoogleAI(apiKey, modelName, ENHANCED_SYSTEM_PROMPT + "\n\n" + analysisPrompt);
    console.log("AI analysis completed");

    // Store the analysis
    console.log("Storing enhanced signal analysis...");
    const { error: agentOutputError } = await supabase.from("agent_outputs").insert({
      user_id,
      agent_name: "Signal Finder",
      output_text: aiResponse,
      user_readable_text: aiResponse, // Same response for both since it's already user-friendly
    });

    if (agentOutputError) {
      console.error("Error storing agent output:", agentOutputError);
    } else {
      console.log("Enhanced analysis stored successfully");
    }

    // Parse and return the AI response
    try {
      const parsedResponse = JSON.parse(aiResponse);
      return new Response(JSON.stringify({ reply: parsedResponse }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      return new Response(JSON.stringify({ 
        reply: { 
          status: "Error", 
          message: "AI analysis completed but response format was invalid",
          raw_response: aiResponse
        } 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Enhanced Signal Finder Agent Error:", error.message);
    return new Response(
      JSON.stringify({ error: `Enhanced Signal Finder failed: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
