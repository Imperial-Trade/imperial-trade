
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
    .from("trade_journal_entries")
    .select("notes, entry_price, exit_price, pnl")
    .eq("user_id", userId)
    .not("exit_price", "is", null); // Only consider completed trades

  if (error) throw error;
  if (!trades) return [];

  // Group trades by strategy extracted from notes
  const strategies = trades.reduce((acc, trade) => {
    const strategy = extractStrategyFromNotes(trade.notes) || "Uncategorized";
    if (!acc[strategy]) {
      acc[strategy] = { wins: 0, losses: 0 };
    }
    if (trade.pnl > 0) {
      // Use P&L to determine wins/losses
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

// Helper function to extract strategy from trade notes
function extractStrategyFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  
  // Simple keyword extraction for common strategies
  const strategies = ['breakout', 'reversal', 'trend', 'scalp', 'swing', 'momentum', 'support', 'resistance'];
  for (const strategy of strategies) {
    if (notes.toLowerCase().includes(strategy)) {
      return strategy.charAt(0).toUpperCase() + strategy.slice(1);
    }
  }
  return null;
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables.");
    }

    const { user_id }: SignalFinderRequest = await req.json();
    if (!user_id) throw new Error("user_id is required.");

    console.log("Signal Finder Agent - Processing request for user:", user_id);

    // Use service role key for database operations to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile information for personalized feedback
    console.log("Signal Finder Agent - Fetching user profile...");
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("real_name, display_name")
      .eq("id", user_id)
      .single();

    if (profileError) {
      console.error("Signal Finder Agent - Error fetching user profile:", profileError);
      throw new Error("Failed to fetch user profile information");
    }

    const userName = userProfile?.display_name || userProfile?.real_name || "Trader";
    console.log("Signal Finder Agent - User name resolved:", userName);

    const winningPatterns = await getWinningPatterns(supabase, user_id);
    if (winningPatterns.length === 0) {
      return new Response(
        JSON.stringify({ reply: { status: "NoWinningPatterns" } }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch latest Deconstructor analysis using user_readable_text
    const { data: latestAnalysis } = await supabase
      .from("agent_outputs")
      .select("output_text, user_readable_text")
      .eq("user_id", user_id)
      .eq("agent_name", "Deconstructor")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const liveMarketData = await fetchMarketData();

    // Generate technical response (with IDs for logging)
    const technicalPrompt = `
      Context from Deconstructor: ${
        latestAnalysis?.output_text || "No recent analysis available."
      }
      User's Winning Patterns: ${JSON.stringify(winningPatterns)}
      Live Market Data: ${JSON.stringify(liveMarketData)}
      Based on all of the above, identify any opportunity flags.
    `;
    const fullTechnicalPrompt = `${SYSTEM_PROMPT}\n\n--- CONTEXT & DATA ---\n${technicalPrompt}`;

    // Generate user-readable response (with actual names)
    const userReadablePrompt = `
      Context from ${userName}'s Recent Analysis: ${
        latestAnalysis?.user_readable_text || "No recent analysis available."
      }
      ${userName}'s Winning Patterns: ${JSON.stringify(winningPatterns)}
      Live Market Data: ${JSON.stringify(liveMarketData)}
      Based on all of the above, identify any opportunity flags for ${userName}.
    `;
    const fullUserReadablePrompt = `${SYSTEM_PROMPT}\n\n--- CONTEXT & DATA ---\n${userReadablePrompt}`;

    const modelName = "gemini-1.5-pro-latest";

    console.log("Signal Finder Agent - Generating technical response...");
    const technicalResponse = await callGoogleAI(apiKey, modelName, fullTechnicalPrompt);
    console.log("Signal Finder Agent - Technical response generated:", technicalResponse.substring(0, 100) + "...");

    console.log("Signal Finder Agent - Generating user-readable response...");
    const userReadableResponse = await callGoogleAI(apiKey, modelName, fullUserReadablePrompt);
    console.log("Signal Finder Agent - User-readable response generated:", userReadableResponse.substring(0, 100) + "...");

    // Store both versions in agent_outputs table
    console.log("Signal Finder Agent - Storing agent output...");
    const { error: agentOutputError } = await supabase.from("agent_outputs").insert({
      user_id,
      agent_name: "Signal Finder",
      output_text: technicalResponse,
      user_readable_text: userReadableResponse,
    });

    if (agentOutputError) {
      console.error("Signal Finder Agent - Error storing agent output:", agentOutputError);
    } else {
      console.log("Signal Finder Agent - Agent output stored successfully");
    }

    // Return user-readable response parsed as JSON
    try {
      return new Response(JSON.stringify({ reply: JSON.parse(userReadableResponse) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseError) {
      console.error("Signal Finder Agent - Failed to parse user-readable response as JSON, returning as text");
      return new Response(JSON.stringify({ reply: { status: "Error", message: userReadableResponse } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
