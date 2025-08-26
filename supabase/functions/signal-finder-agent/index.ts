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

interface EnhancedMarketDataPoint {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
  dataSource: "twelve_data" | "alpha_vantage" | "yahoo_finance" | "mock";
  dataQuality: "real_time" | "delayed" | "simulated";
  technicalIndicators?: {
    rsi?: number;
    macd?: number;
    ma20?: number;
    ma50?: number;
    ma200?: number;
    bollingerUpper?: number;
    bollingerLower?: number;
    stochastic?: number;
    williamsR?: number;
    support?: number;
    resistance?: number;
  };
  marketContext?: {
    trend: "bullish" | "bearish" | "sideways";
    volatility: "low" | "medium" | "high";
    volume_profile: "above_average" | "below_average" | "normal";
    assetClass: "stocks" | "crypto" | "forex" | "commodities" | "etfs";
  };
}

const ENHANCED_SYSTEM_PROMPT = `You are an elite AI trading pattern analyst with expertise across multiple asset classes. Your mission is to identify the BEST 12-16 high-probability trading opportunities from a universe of 25+ diverse instruments including stocks, crypto, forex, commodities, and ETFs.

**CORE ANALYSIS FRAMEWORK:**

1. **Multi-Asset Class Pattern Recognition**:
   - **Stocks**: Earnings reactions, sector rotations, gap plays, institutional flows
   - **Crypto**: Whale movements, DeFi trends, regulatory impacts, correlation breaks
   - **Forex**: Central bank policies, economic data reactions, carry trade dynamics
   - **Commodities**: Supply/demand fundamentals, seasonal trends, geopolitical factors
   - **ETFs**: Sector rotation signals, broad market sentiment, flow dynamics

2. **Advanced Technical Confluence**:
   - Multi-timeframe analysis (1H, 4H, 1D convergence)
   - Cross-asset correlation analysis and divergences
   - Volume profile confirmation and institutional footprints
   - Momentum oscillator confluences (RSI, Stochastic, Williams %R)
   - Moving average cluster analysis (20, 50, 200 MA interactions)

3. **Real-Time Market Context Integration**:
   - Current market regime identification (risk-on vs risk-off)
   - Cross-market correlation analysis and breakdowns
   - Volatility environment assessment per asset class
   - Market hours and liquidity considerations

4. **Risk-Reward Optimization**:
   - Asset class specific position sizing recommendations
   - Volatility-adjusted risk management per instrument
   - Correlation-based portfolio exposure warnings
   - Market regime specific risk adjustments

**SIGNAL SELECTION CRITERIA:**

Generate EXACTLY 12-16 signals with this distribution:
- **40% Stocks** (5-6 signals): Focus on sector leaders, earnings plays, gap setups
- **25% Crypto** (3-4 signals): Major coins with strong technical setups
- **20% Forex** (2-3 signals): Major pairs with fundamental catalysts
- **15% Commodities/ETFs** (2-3 signals): Trend continuation or reversal setups

**RESPONSE FORMAT (JSON ARRAY ONLY):**
[
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
    "market_context": "[Current market environment for this asset class]",
    "pattern_explanation": "[Why this pattern is forming]",
    "risk_factors": "[Asset class specific risks]",
    "educational_note": "[Learning opportunity explanation]",
    "asset_class": "[stocks|crypto|forex|commodities|etfs]"
  }
]

**CRITICAL REQUIREMENTS:**
- ONLY analyze instruments present in the provided market data
- Ensure diverse asset class representation as specified above
- Require multiple technical confirmations for "High" confidence
- Include asset class specific risk warnings
- Focus on educational value while maintaining accuracy
- Prioritize patterns with 2:1+ risk-reward ratios
- Consider current market volatility and regime
- Never guarantee outcomes - emphasize probability and risk management

**DATA QUALITY AWARENESS:**
- Acknowledge if using simulated vs. real-time data
- Adjust confidence levels based on data quality
- Include warnings for delayed or simulated data sources`;

async function getWinningPatterns(
  supabase: SupabaseClient,
  userId: string
): Promise<any[]> {
  try {
    const { data: trades, error } = await supabase
      .from("trade_journal_entries")
      .select("notes, entry_price, exit_price, pnl, symbol")
      .eq("user_id", userId)
      .not("exit_price", "is", null);

    if (error) {
      console.error("Error fetching trade journal entries:", error);
      return [];
    }

    if (!trades || trades.length === 0) return [];

    const strategies = trades.reduce((acc, trade) => {
      const strategy =
        extractStrategyFromNotes(trade.notes) || "Pattern Trading";
      if (!acc[strategy]) {
        acc[strategy] = { wins: 0, losses: 0, instruments: new Set() };
      }
      if (trade.pnl > 0) {
        acc[strategy].wins++;
      } else {
        acc[strategy].losses++;
      }
      acc[strategy].instruments.add(
        trade.symbol || trade.entry_price?.toString() || "Unknown"
      );
      return acc;
    }, {} as Record<string, { wins: number; losses: number; instruments: Set<string> }>);

    return Object.entries(strategies)
      .filter(([, stats]) => stats.wins > stats.losses && stats.wins >= 2)
      .map(([name, stats]) => ({
        strategy_name: name,
        win_rate: ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1),
        total_trades: stats.wins + stats.losses,
        preferred_instruments: Array.from(stats.instruments),
      }));
  } catch (error) {
    console.error("Error in getWinningPatterns:", error);
    return [];
  }
}

function extractStrategyFromNotes(notes: string | null): string | null {
  if (!notes) return null;

  const strategies = [
    "breakout",
    "reversal",
    "momentum",
    "scalp",
    "swing",
    "trend following",
    "support resistance",
    "pattern trading",
    "technical analysis",
    "price action",
    "gap play",
    "earnings play",
    "sector rotation",
    "carry trade",
    "mean reversion",
  ];

  for (const strategy of strategies) {
    if (notes.toLowerCase().includes(strategy)) {
      return strategy.charAt(0).toUpperCase() + strategy.slice(1);
    }
  }
  return null;
}

async function fetchEnhancedMarketData(
  supabase: SupabaseClient
): Promise<EnhancedMarketDataPoint[]> {
  try {
    console.log("Fetching enhanced market data for 25+ instruments...");

    // Request all available symbols for comprehensive analysis
    const { data, error } = await supabase.functions.invoke("get-market-data", {
      body: {
        symbols: [], // Empty array means get all default symbols
        includeVolume: true,
        includeTechnicals: true,
      },
    });

    if (error) {
      console.error("Enhanced market data fetch error:", error);
      return [];
    }

    const marketData = data?.prices || [];
    console.log(`Fetched enhanced data for ${marketData.length} instruments`);
    console.log(
      `Data quality: ${data?.dataQuality}, Market hours: ${data?.marketHours}`
    );

    return marketData;
  } catch (error) {
    console.error("Failed to fetch enhanced market data:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables.");
    }

    const { user_id }: SignalFinderRequest = await req.json();
    if (!user_id) throw new Error("user_id is required.");

    console.log(
      "Enhanced Signal Finder Agent - Processing request for user:",
      user_id
    );

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

    const userName =
      userProfile?.display_name || userProfile?.real_name || "Trader";
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

    // Fetch enhanced market data for 25+ instruments
    console.log("Fetching enhanced market data...");
    const enhancedMarketData = await fetchEnhancedMarketData(supabase);

    if (enhancedMarketData.length === 0) {
      return new Response(
        JSON.stringify({
          reply: {
            status: "NoMarketData",
            message: "Unable to fetch enhanced market data",
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Group market data by asset class for analysis
    const dataByAssetClass = enhancedMarketData.reduce((acc, data) => {
      const assetClass = data.marketContext?.assetClass || "stocks";
      if (!acc[assetClass]) acc[assetClass] = [];
      acc[assetClass].push(data);
      return acc;
    }, {} as Record<string, EnhancedMarketDataPoint[]>);

    // Prepare comprehensive multi-asset analysis prompt
    const analysisPrompt = `
**ENHANCED MULTI-ASSET PATTERN ANALYSIS REQUEST**

**Trader Profile:**
- Name: ${userName}
- Winning Strategies: ${JSON.stringify(winningPatterns, null, 2)}
- Recent Analysis: ${
      latestAnalysis?.output_text || "No recent analysis available"
    }

**LIVE MARKET DATA (${enhancedMarketData.length} Instruments):**

**Data Quality Information:**
- Total Instruments: ${enhancedMarketData.length}
- Data Sources: ${Array.from(
      new Set(enhancedMarketData.map((d) => d.dataSource))
    ).join(", ")}
- Data Quality: ${Array.from(
      new Set(enhancedMarketData.map((d) => d.dataQuality))
    ).join(", ")}

**Asset Class Breakdown:**
${Object.entries(dataByAssetClass)
  .map(
    ([assetClass, data]) =>
      `${assetClass.toUpperCase()}: ${data.length} instruments`
  )
  .join("\n")}

**DETAILED MARKET DATA:**
${JSON.stringify(enhancedMarketData, null, 2)}

**ANALYSIS REQUIREMENTS:**

1. **Generate EXACTLY 12-16 trading signals** with the specified asset class distribution
2. **Multi-Asset Class Analysis**: Identify the best opportunities across all asset classes
3. **Technical Confluence**: Look for multiple confirming indicators per setup
4. **Risk Management**: Include asset class specific risk warnings
5. **Market Context**: Consider current market regime and cross-asset correlations
6. **Educational Value**: Explain why each pattern is forming and what traders can learn

**SELECTION CRITERIA:**
- Prioritize patterns with strong technical confluence
- Ensure diverse asset class representation
- Focus on 2:1+ risk-reward ratios
- Consider current volatility environment
- Include both short-term and swing trading opportunities

Generate a JSON array of 12-16 high-quality trading signals that represent the best opportunities from this enhanced market data.
`;

    const modelName = "gemini-2.5-pro";

    console.log("Generating enhanced multi-asset analysis with Gemini AI...");
    const aiResponse = await callGoogleAI(
      apiKey,
      modelName,
      ENHANCED_SYSTEM_PROMPT + "\n\n" + analysisPrompt
    );
    console.log("Enhanced AI analysis completed");

    // Store the analysis
    console.log("Storing enhanced signal analysis...");
    const { error: agentOutputError } = await supabase
      .from("agent_outputs")
      .insert({
        user_id,
        agent_name: "Signal Finder",
        output_text: aiResponse,
        user_readable_text: aiResponse,
      });

    if (agentOutputError) {
      console.error("Error storing agent output:", agentOutputError);
    } else {
      console.log("Enhanced analysis stored successfully");
    }

    // Parse and return the AI response
    try {
      const parsedResponse = JSON.parse(aiResponse);

      // Ensure we have an array of signals
      const signals = Array.isArray(parsedResponse)
        ? parsedResponse
        : [parsedResponse];

      console.log(`Generated ${signals.length} enhanced trading signals`);

      return new Response(
        JSON.stringify({
          reply: {
            status: "MultipleMatches",
            signals: signals,
            totalAnalyzed: enhancedMarketData.length,
            assetClassBreakdown: Object.entries(dataByAssetClass).reduce(
              (acc, [assetClass, data]) => {
                acc[assetClass] = data.length;
                return acc;
              },
              {} as Record<string, number>
            ),
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      return new Response(
        JSON.stringify({
          reply: {
            status: "Error",
            message:
              "Enhanced AI analysis completed but response format was invalid",
            raw_response: aiResponse.substring(0, 1000), // Truncate for debugging
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Enhanced Signal Finder Agent Error:", error.message);
    return new Response(
      JSON.stringify({
        error: `Enhanced Signal Finder failed: ${error.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
