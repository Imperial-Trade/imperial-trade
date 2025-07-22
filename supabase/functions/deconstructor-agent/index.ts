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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing required environment variables.");
    }

    const { user_id }: DeconstructorRequest = await req.json();
    if (!user_id) throw new Error("user_id is required.");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

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

    const userActionPrompt = `Analyze these trades for patterns and blindspots: ${JSON.stringify(
      sanitizedTrades
    )}`;
    const fullPrompt = `${SYSTEM_PROMPT}\n\n--- DATA ---\n${userActionPrompt}`;

    const modelName = "gemini-1.5-pro-latest";

    const deconstructorResponse = await callGoogleAI(
      apiKey,
      modelName,
      fullPrompt
    );

    await supabase.from("agent_outputs").insert({
      user_id,
      agent_name: "Deconstructor",
      output_text: deconstructorResponse,
    });

    return new Response(JSON.stringify({ reply: deconstructorResponse }), {
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
