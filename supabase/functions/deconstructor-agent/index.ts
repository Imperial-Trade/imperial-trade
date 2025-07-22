
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAI } from "../_shared/google-ai-helper.ts";
import { sanitizeText } from "../_shared/sanitizer.ts";

interface DeconstructorRequest {
  user_id: string;
}

const SYSTEM_PROMPT = `You are "Helios," a quantitative performance analyst AI. Your function is to provide objective, data-driven analysis of a trader's performance, identifying statistical edges and behavioral patterns. Your tone is neutral, precise, and analytical.
**Output Format:** Your analysis must be structured in Markdown with the following sections:
### 1. Key Performance Metrics
- Calculate and display basic metrics from the provided trade data (e.g., Win Rate, Average Win, Average Loss, Risk:Reward Ratio).
### 2. Behavioral Pattern Analysis
- Identify and list recurring behaviors based on trade data. Examples:
  - "Pattern Identified: Tendency to exit profitable trades before price reaches the initial target."
  - "Pattern Identified: Stop-loss is consistently widened on losing positions in the 'Resistance Breakout' setup."
### 3. Journal-Sourced Blindspots
- Scan the \`raw_journal_text\` for language indicating emotional decision-making. Flag these as potential blindspots.
  - "Blindspot Flag: Journal entry for trade #X contains language ('frustrated', 'make the money back') consistent with 'Revenge Trading,' a behavior that statistically invalidates a trading edge."
### 4. Performance Summary
- Provide a concise, objective summary of the findings.
**Execution Rule:** Do not provide advice, motivation, or predictions. Your sole purpose is to reflect the data back to the user in a structured, analytical format.`;

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

    const { user_id }: DeconstructorRequest = await req.json();
    if (!user_id) throw new Error("user_id is required.");

    console.log("Deconstructor Agent - Processing request for user:", user_id);

    // Use service role key for database operations to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile information for personalized feedback
    console.log("Deconstructor Agent - Fetching user profile...");
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("real_name, display_name")
      .eq("id", user_id)
      .single();

    if (profileError) {
      console.error("Deconstructor Agent - Error fetching user profile:", profileError);
      throw new Error("Failed to fetch user profile information");
    }

    const userName = userProfile?.display_name || userProfile?.real_name || "Trader";
    console.log("Deconstructor Agent - User name resolved:", userName);

    const { data: trades, error: fetchError } = await supabase
      .from("trade_journal_entries")
      .select("asset_ticker, trade_type, entry_price, exit_price, notes, pnl, trade_date")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (fetchError) throw fetchError;
    if (!trades || trades.length === 0) {
      return new Response(
        JSON.stringify({
          reply: "No trades found to analyze. Please log some trades first.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sanitizedTrades = trades.map((trade) => ({
      ...trade,
      notes: sanitizeText(trade.notes),
    }));

    // Generate technical response (with IDs for logging)
    const technicalPrompt = `Analyze these trades for patterns and blindspots: ${JSON.stringify(
      sanitizedTrades
    )}`;
    const fullTechnicalPrompt = `${SYSTEM_PROMPT}\n\n--- DATA ---\n${technicalPrompt}`;

    // Generate user-readable response (with actual names)
    const userReadablePrompt = `Analyze ${userName}'s recent trades for patterns and blindspots: ${JSON.stringify(
      sanitizedTrades
    )}`;
    const fullUserReadablePrompt = `${SYSTEM_PROMPT}\n\n--- DATA ---\n${userReadablePrompt}`;

    const modelName = "gemini-1.5-pro-latest";

    console.log("Deconstructor Agent - Generating technical response...");
    const technicalResponse = await callGoogleAI(
      apiKey,
      modelName,
      fullTechnicalPrompt
    );
    console.log("Deconstructor Agent - Technical response generated:", technicalResponse.substring(0, 100) + "...");

    console.log("Deconstructor Agent - Generating user-readable response...");
    const userReadableResponse = await callGoogleAI(
      apiKey,
      modelName,
      fullUserReadablePrompt
    );
    console.log("Deconstructor Agent - User-readable response generated:", userReadableResponse.substring(0, 100) + "...");

    // Store both versions in agent_outputs table
    console.log("Deconstructor Agent - Storing agent output...");
    const { error: agentOutputError } = await supabase.from("agent_outputs").insert({
      user_id,
      agent_name: "Deconstructor",
      output_text: technicalResponse,
      user_readable_text: userReadableResponse,
    });

    if (agentOutputError) {
      console.error("Deconstructor Agent - Error storing agent output:", agentOutputError);
    } else {
      console.log("Deconstructor Agent - Agent output stored successfully");
    }

    return new Response(JSON.stringify({ reply: userReadableResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Deconstructor Agent Error:", error.message);
    return new Response(
      JSON.stringify({ error: `Deconstructor Agent failed: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
