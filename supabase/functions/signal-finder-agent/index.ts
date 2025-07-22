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

const SYSTEM_PROMPT = `You are "Orion," a tactical trade setup analyst. Your function is to identify potential trading opportunities by matching a user's historically successful patterns against live market data, contextualized by their recent behavioral analysis. Your tone is concise, actionable, and risk-aware.
**Core Directives:**
1.  **Primary Task: Pattern Matching:** Your main goal is to check if current \`live_market_data\` meets the conditions of the user's \`historical_winning_patterns\`.
2.  **Contextual Filter:** Use the provided \`Context from Deconstructor\` to add a layer of caution. If the Deconstructor noted a relevant blindspot (e.g., "user chases breakouts"), and you find a breakout setup, you must add a specific cautionary note.
3.  **Strict Output Format:** If a match is found, your output must be a JSON object with the following structure:
    \`\`\`json
    {
      "status": "MatchFound",
      "asset": "[Asset Name]",
      "strategy_name": "[Name of Matched Strategy]",
      "confidence": "High" | "Medium",
      "deconstructor_context_note": "[Cautionary note based on user's blindspots, or 'None']",
      "disclaimer": "This is a high-probability pattern based on your historical data, not a trade signal. Perform your own due diligence and apply your risk management plan."
    }
    \`\`\`
4.  **No Match Scenario:** If no patterns match, return: \`{"status": "NoMatch"}\`.
**Execution Rule:** You are a pattern-matching engine, not a financial advisor. Never guarantee success. Your language must be probabilistic and heavily emphasize risk management and independent analysis.`;

// Initial logic to find a user's winning strategies.
async function getWinningPatterns(
  supabase: SupabaseClient,
  userId: string
): Promise<any[]> {
  const { data: trades, error } = await supabase
    .from("trades")
    .select("strategy_used, entry_price, exit_price")
    .eq("user_id", userId)
    .not("exit_price", "is", null); // Only consider completed trades

  if (error) throw error;
  if (!trades) return [];

  // Group trades by strategy
  const strategies = trades.reduce((acc, trade) => {
    const strategy = trade.strategy_used || "Uncategorized";
    if (!acc[strategy]) {
      acc[strategy] = { wins: 0, losses: 0 };
    }
    if (trade.exit_price > trade.entry_price) {
      // Simple win/loss logic for long trades
      acc[strategy].wins++;
    } else {
      acc[strategy].losses++;
    }
    return acc;
  }, {} as Record<string, { wins: number; losses: number }>);

  // Filter for strategies with a win rate > 50%
  const winningStrategies = Object.entries(strategies)
    .filter(([, stats]) => stats.wins > stats.losses)
    .map(([name, stats]) => ({
      strategy_name: name,
      // This is a placeholder; you would need a way to store the actual conditions for each strategy.
      conditions: `Conditions for ${name} need to be defined.`,
    }));

  return winningStrategies;
}

// Placeholder for a real market data API call.
async function fetchMarketData(): Promise<any> {
  try {
    // Example: const response = await fetch('https://api.yourmarketdata.com/v1/data');
    // if (!response.ok) throw new Error('Market data API failed');
    // return await response.json();

    // Returning an empty object if the API fails or has no data.
    return {};
  } catch (e) {
    console.error("Failed to fetch market data:", e.message);
    return {}; // Return empty object on failure to prevent crash
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing required environment variables.");
    }

    const { user_id }: SignalFinderRequest = await req.json();
    if (!user_id) throw new Error("user_id is required.");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const winningPatterns = await getWinningPatterns(supabase, user_id);
    if (winningPatterns.length === 0) {
      return new Response(
        JSON.stringify({ reply: { status: "NoWinningPatterns" } }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: latestAnalysis } = await supabase
      .from("agent_outputs")
      .select("output_text")
      .eq("user_id", user_id)
      .eq("agent_name", "Deconstructor")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const liveMarketData = await fetchMarketData();

    const prompt = `
      Context from Deconstructor: ${
        latestAnalysis?.output_text || "No recent analysis available."
      }
      User's Winning Patterns: ${JSON.stringify(winningPatterns)}
      Live Market Data: ${JSON.stringify(liveMarketData)}
      Based on all of the above, identify any opportunity flags.
    `;
    const fullPrompt = `${SYSTEM_PROMPT}\n\n--- CONTEXT & DATA ---\n${prompt}`;

    const modelName = "gemini-1.5-pro-latest";

    const signalResponse = await callGoogleAI(apiKey, modelName, fullPrompt);

    return new Response(JSON.stringify({ reply: JSON.parse(signalResponse) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Signal Finder Agent Error:", error.message);
    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({
          error: "AI returned a response that was not valid JSON.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    return new Response(
      JSON.stringify({ error: `Signal Finder Agent failed: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
