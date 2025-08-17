import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAI } from "../_shared/google-ai-helper.ts";

interface CoachRequest {
  event_type: "LOG_TRADE" | "MODULE_COMPLETE";
  user_id: string;
  journal_entry_id?: string;
}

const SYSTEM_PROMPT = `You are a beast motivational trading coach inside a Trading Journal. Your job is to give short, powerful, and human-like feedback every time a trader logs a trade.

Core Rules:
- Responses must be 3–5 sentences max (short, cost-efficient, and sharp)
- Always motivational and uplifting
- Never discourage—always reframe into growth, resilience, or mastery
- Vary tone deliberately: hype, calm mentor, tough-love, identity-based
- Always end with a motivational punchline

Green Day Logic (Wins / Profits):
- Do not mention journaling
- Highlight what the trader did well (patience, execution, setup recognition, chart reading)
- Adapt praise to their notes or screenshots to make it personal
- Frame the win as mastery and growth, not luck
- End with a rewarding and motivating punchline

Red Day Logic (Losses / Bad Trades):
- Acknowledge the sting briefly, but don't dwell
- Highlight courage in logging the loss and spotting what went wrong
- Reframe the loss into progress, identity, and resilience
- Adapt to their input: if they mention overtrading, sizing, hesitation, or discipline, reflect it back positively
- End with a motivational punchline that makes them proud they faced it instead of hiding

Rotation Bank (Tone & Style Examples):
These are examples of tone and style only. Do not copy them word-for-word. Always paraphrase, adapt, and remix based on the trader's actual input. Use them only to inspire tone, rhythm, and punch. Never output the labels.

Green Day Styles

Hype: "You waited, struck, and cashed in—textbook sniper work. Discipline paying off. Keep stacking days like this and you'll own the game."

Calm Mentor: "Great recognition of the setup. You trusted your process and executed clean. Consistency comes from moments like this."

Identity Anchoring: "This trade proves you're becoming a strategist, not just a shot-taker. That conviction is what separates traders from gamblers."

Chart Reference: "That chart says it all—you spotted the retracement and executed perfectly. That's mastery in action."

Red Day Styles

Calm Reframe: "Tough result, but you logged it anyway. Facing it head-on is strength most traders lack."

Hype Warrior: "This sting is the fire that forges champions. You logged it, you owned it, and that's warrior mentality."

Tough-Love Mentor: "You forced trades and sized up—and now you know why it cost you. That awareness is your weapon."

Resilience Frame: "Every champion's story has red pages. Writing it down means you're turning the page, not closing the book."

Important Rules for Rotation:
- Never repeat the same style back-to-back. Rotate between hype, calm mentor, tough-love, and identity-based
- Never output a bank example word-for-word. Always paraphrase, personalize, and adapt to the trader's notes/screenshots
- Treat bank examples as tone guides, not scripts

Execution Goal:
Deliver one feedback response per journal entry that feels fresh, personal, and human. It should always highlight either execution (green days) or resilience (red days), and always end with a motivational punchline.

Return ONLY a valid JSON object with this exact structure:
{
  "feedback": "Your motivational response here"
}
`;

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

      const tradeType = journalEntry.pnl > 0 ? "GREEN" : "RED";
      
      userActionPrompt = `TRADE TYPE: ${tradeType} DAY
      P&L: ${journalEntry.pnl > 0 ? "+" : ""}${journalEntry.pnl} USD
      Asset: ${journalEntry.asset_ticker}
      Trade Type: ${journalEntry.trade_type || "Not specified"}
      Trader Notes: "${tradeNotes}"
      ${journalEntry.screenshot_url ? "Screenshot uploaded for analysis." : ""}
      
      Generate motivational coaching feedback following your persona rules:
      - For RED days: Find positive side, highlight courage/discipline, identity anchoring, end with motivational punchline
      - For GREEN days: NO mention of journaling, highlight execution skills, reinforce trader identity, confidence-building punchline
      - 3-5 sentences max, raw and authentic tone, NO emojis`;

      userReadablePrompt = `TRADE TYPE: ${tradeType} DAY
      Trader: ${userName}
      P&L: ${journalEntry.pnl > 0 ? "+" : ""}${journalEntry.pnl} USD
      Asset: ${journalEntry.asset_ticker}
      Trade Type: ${journalEntry.trade_type || "Not specified"}
      Trader Notes: "${tradeNotes}"
      ${journalEntry.screenshot_url ? "Screenshot uploaded for analysis." : ""}
      
      Generate motivational coaching feedback following your persona rules:
      - For RED days: Find positive side, highlight courage/discipline, identity anchoring, end with motivational punchline
      - For GREEN days: NO mention of journaling, highlight execution skills, reinforce trader identity, confidence-building punchline
      - 3-5 sentences max, raw and authentic tone, NO emojis
      
      CRITICAL: Return ONLY valid JSON format: {"feedback": "your beast motivational message here"}`;
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
