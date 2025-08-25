import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAI } from "../_shared/google-ai-helper.ts";

interface CoachRequest {
  event_type: "LOG_TRADE" | "MODULE_COMPLETE";
  user_id: string;
  journal_entry_id?: string;
}

const SYSTEM_PROMPT = `You are a supportive trading coach who acts like a human mentor. Your role is to analyze trade entries and provide personalized, encouraging feedback that validates the trader's understanding and reinforces good habits.

**Core Analysis Framework:**
1. **Trade Outcome Analysis**: Determine if this was a winning trade (positive P&L) or losing trade (negative P&L)
2. **Note Content Analysis**: Carefully analyze the trader's notes for specific trading concepts, strategies, and insights they mention
3. **Concept Recognition**: Identify and acknowledge advanced trading concepts like:
   - Market manipulation and liquidity sweeps
   - Price action analysis and patterns
   - Risk management techniques
   - Entry/exit strategies
   - Market structure analysis
   - Support/resistance levels
   - Any other sophisticated trading terminology

**Response Guidelines:**
- Provide 1-2 sentences of encouraging, tailored feedback
- Acknowledge specific concepts mentioned in their notes by name
- Validate their understanding of advanced market behaviors
- Frame their observations positively as part of professional analysis
- Encourage continued development of the specific skills they demonstrated
- Make them feel seen and validated in their learning journey

**Example Response Structure:**
For winning trades: "Excellent work identifying [specific concept from notes]! Your ability to recognize [trading concept] shows sophisticated market understanding that's crucial for consistent success."
For losing trades: "Great analysis noting [specific concept from notes]. This level of detailed observation of [trading concept] demonstrates the professional mindset needed to improve and succeed."

**Key Principle**: Act like a mentor who reads their trade notes, understands what they're learning, and gives personalized validation of their specific insights and efforts.`;

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

    const { event_type, user_id, journal_entry_id }: CoachRequest =
      await req.json();
    if (!event_type || !user_id) {
      throw new Error("event_type and user_id are required.");
    }

    console.log("Coach Agent - Processing request:", {
      event_type,
      user_id,
      journal_entry_id,
    });

    // Use service role key for database operations to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile information for personalized feedback
    console.log("Coach Agent - Fetching user profile...");
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("real_name, display_name")
      .eq("id", user_id)
      .single();

    if (profileError) {
      console.error("Coach Agent - Error fetching user profile:", profileError);
      throw new Error("Failed to fetch user profile information");
    }

    const userName =
      userProfile?.display_name || userProfile?.real_name || "Trader";
    console.log("Coach Agent - User name resolved:", userName);

    let userActionPrompt = "";
    let userReadablePrompt = "";

    if (event_type === "LOG_TRADE") {
      // Fetch the actual trade journal entry for detailed analysis
      console.log("Coach Agent - Fetching trade journal entry...");
      const { data: journalEntry, error: journalError } = await supabase
        .from("trade_journal_entries")
        .select(
          "asset_ticker, pnl, notes, entry_price, exit_price, position_size, trade_type, screenshot_url"
        )
        .eq("id", journal_entry_id)
        .eq("user_id", user_id)
        .single();

      if (journalError) {
        console.error(
          "Coach Agent - Error fetching journal entry:",
          journalError
        );
        throw new Error("Failed to fetch trade journal entry");
      }

      const tradeOutcome =
        journalEntry.pnl > 0 ? "winning trade" : "losing trade";
      const pnlAmount = Math.abs(journalEntry.pnl);
      const tradeNotes = journalEntry.notes || "No notes provided";

      console.log("Coach Agent - Trade analysis:", {
        outcome: tradeOutcome,
        pnl: pnlAmount,
        notes: tradeNotes.substring(0, 100) + "...",
      });

      userActionPrompt = `The user (ID: ${user_id}) submitted a ${tradeOutcome} with ${pnlAmount} USD ${
        journalEntry.pnl > 0 ? "profit" : "loss"
      }. 
      Asset: ${journalEntry.asset_ticker}
      Trade Type: ${journalEntry.trade_type || "Not specified"}
      Their notes: "${tradeNotes}"
      ${
        journalEntry.screenshot_url
          ? "They also uploaded a screenshot for analysis."
          : ""
      }
      
      Analyze their notes for specific trading concepts and provide encouraging feedback that acknowledges the sophisticated analysis they demonstrate.`;

      userReadablePrompt = `${userName} submitted a ${tradeOutcome} with ${pnlAmount} USD ${
        journalEntry.pnl > 0 ? "profit" : "loss"
      }.
      Asset: ${journalEntry.asset_ticker}
      Trade Type: ${journalEntry.trade_type || "Not specified"}
      Their notes: "${tradeNotes}"
      ${
        journalEntry.screenshot_url
          ? "They also uploaded a screenshot for analysis."
          : ""
      }
      
      Provide a supportive coaching response that highlights specific concepts from their notes and validates their trading analysis skills.`;
    } else if (event_type === "MODULE_COMPLETE") {
      userActionPrompt = `The user (ID: ${user_id}) just completed a learning module. Congratulate them on their commitment to education.`;
      userReadablePrompt = `${userName} just completed a learning module. Congratulate them on their commitment to education.`;
    } else {
      throw new Error(`Unsupported event_type: ${event_type}`);
    }

    // Generate technical response (with IDs for logging)
    const fullPrompt = `${SYSTEM_PROMPT}\n\n--- TASK ---\n${userActionPrompt}`;
    const modelName = "gemini-2.5-flash";

    console.log("Coach Agent - Generating AI response...");
    const coachResponse = await callGoogleAI(apiKey, modelName, fullPrompt);
    console.log(
      "Coach Agent - AI response generated:",
      coachResponse.substring(0, 100) + "..."
    );

    // Generate user-readable response (with actual names)
    const userReadableFullPrompt = `${SYSTEM_PROMPT}\n\n--- TASK ---\n${userReadablePrompt}

Return your response in JSON format: {"feedback": "your encouraging message here"}`;
    console.log("Coach Agent - Generating user-readable response...");
    const rawUserReadableResponse = await callGoogleAI(
      apiKey,
      modelName,
      userReadableFullPrompt
    );
    console.log(
      "Coach Agent - User-readable response generated:",
      rawUserReadableResponse.substring(0, 100) + "..."
    );

    // Parse the JSON response to extract the feedback text
    let userReadableResponse = rawUserReadableResponse;
    try {
      const parsedResponse = JSON.parse(rawUserReadableResponse);
      if (parsedResponse.feedback) {
        userReadableResponse = parsedResponse.feedback;
        console.log("Coach Agent - Extracted feedback text from JSON");
      }
    } catch (parseError) {
      console.log(
        "Coach Agent - Failed to parse JSON, using response as-is:",
        parseError
      );
      // If JSON parsing fails, use the response as-is
    }

    // Store the coach output in agent_outputs table with both versions
    console.log("Coach Agent - Storing agent output...");
    const { error: agentOutputError } = await supabase
      .from("agent_outputs")
      .insert({
        user_id,
        agent_name: "Coach",
        output_text: coachResponse,
        user_readable_text: userReadableResponse,
      });

    if (agentOutputError) {
      console.error(
        "Coach Agent - Error storing agent output:",
        agentOutputError
      );
    } else {
      console.log("Coach Agent - Agent output stored successfully");
    }

    // If this is a trade log event and we have a journal entry ID, update the journal entry
    if (event_type === "LOG_TRADE" && journal_entry_id) {
      console.log(
        "Coach Agent - Updating journal entry with coaching feedback..."
      );

      try {
        const { data: updateResult, error: updateError } = await supabase
          .from("trade_journal_entries")
          .update({ ai_positive_feedback: userReadableResponse })
          .eq("id", journal_entry_id)
          .eq("user_id", user_id) // Extra security check
          .select();

        if (updateError) {
          console.error(
            "Coach Agent - Error updating journal entry:",
            updateError
          );
          return new Response(
            JSON.stringify({
              reply: coachResponse,
              warning: "Feedback generated but failed to update journal entry",
              error: updateError.message,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        if (!updateResult || updateResult.length === 0) {
          console.error("Coach Agent - No journal entry found to update");
          return new Response(
            JSON.stringify({
              reply: coachResponse,
              warning:
                "Feedback generated but journal entry not found for update",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(
          "Coach Agent - Journal entry updated successfully:",
          updateResult[0]
        );
      } catch (updateException) {
        console.error(
          "Coach Agent - Exception during journal entry update:",
          updateException
        );
        return new Response(
          JSON.stringify({
            reply: coachResponse,
            warning: "Feedback generated but update failed due to exception",
            error: updateException.message,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(JSON.stringify({ reply: userReadableResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Coach Agent Error:", error.message);
    return new Response(
      JSON.stringify({ error: `Coach Agent failed: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
