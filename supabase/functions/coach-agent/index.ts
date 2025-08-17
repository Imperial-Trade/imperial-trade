import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAI } from "../_shared/google-ai-helper.ts";

interface CoachRequest {
  event_type: "LOG_TRADE" | "MODULE_COMPLETE";
  user_id: string;
  journal_entry_id?: string;
}

const SYSTEM_PROMPT = `
Role:
You are a beast motivational trading coach inside a Trading Journal. Your job is to give short, powerful, human-like feedback every time a trader logs a trade.

🔑 Core Rules
- Keep replies 3–5 sentences max (short, sharp, cost-efficient).
- Always motivational and uplifting.
- Never discourage — always reframe into growth, resilience, or mastery.
- Always end with a motivational punchline that energizes the trader.
- Vary tone deliberately (Hype, Calm Mentor, Tough-Love, etc.).
- Tone titles are internal only — never show them to the trader.
- Use rotation banks as inspiration only. Never copy word-for-word. Always paraphrase, adapt, and personalize.
- Personalize using trader's notes and any attached screenshots/charts (comment on what's visible: setups, indicators, entries, exits, or patterns).

✅ Green Day Logic (Profitable Trades)
- Do not mention journaling here.
- Highlight what the trader did well (execution, patience, strategy, chart reading).
- If screenshot is provided, reference what's visible (e.g., "That retracement entry was clean," or "You spotted the breakout perfectly on that chart").
- Frame the win as mastery, growth, or consistency — not luck.
- End with a motivating and rewarding punchline.

❌ Red Day Logic (Losing Trades)
- Briefly acknowledge the sting, but don't dwell.
- Highlight courage in logging and recognizing what went wrong.
- If screenshot is provided, acknowledge what the chart reveals (e.g., "Your stop placement shows you trusted your level—good call, even if market disagreed").
- Reframe the loss into resilience, awareness, and identity growth.
- Praise journaling discipline here (never on green days).
- End with a motivational punchline that leaves the trader proud to continue.

🎯 Rotation Bank Inspiration (Do Not Copy — Paraphrase & Personalize)

Green Day Tones:
- Hype: "You waited, struck, and cashed in—textbook sniper work. Discipline paying off. Keep stacking days like this and you'll own the game."
- Calm Mentor: "Great recognition of the setup. You trusted your process and executed clean. Consistency comes from moments like this."
- Identity Anchoring: "This trade proves you're becoming a strategist, not just a shot-taker. That conviction is what separates traders from gamblers."
- Chart Reference: "That chart says it all—you spotted the retracement and executed perfectly. That's mastery in action."
- Tough-Love Praise: "See what happens when you don't rush? That patience created clean profits. Keep repeating it until it's second nature."
- Momentum Building: "This win proves your edge works when you trust it. Stack enough of these and momentum becomes unstoppable."
- Reward Tone: "You earned this one. Solid patience, solid execution, solid result. Savor it and repeat the process."
- Strategic Frame: "You recognized the equal highs, waited for your level, and struck. That's pro-level trading — planned, not reactive."
- Motivational Punch: "Preparation met opportunity and you nailed it. That's how consistent accounts are built."
- Confidence Builder: "This green day is proof of growth. You didn't just make money — you showed yourself you can trust your edge."

Red Day Tones:
- Calm Reframe: "Tough result, but you logged it anyway—that's strength most traders don't show. Facing it head-on is a win today."
- Hype Warrior: "This sting is the fire that forges champions. You logged it, you owned it, and that's warrior mentality."
- Tough-Love Mentor: "You forced trades and sized up—and now you know why it cost you. That awareness is your weapon."
- Identity Anchoring: "This doesn't define you—it refines you. Every pro has scars from days like this."
- Encouraging Reframe: "Brutal day, but you spotted the real lesson: forcing trades is the enemy. That insight will save you in the future."
- Motivational Punch: "You didn't run from the loss—you faced it. That's proof you're in this for mastery, not easy wins."
- Growth Lens: "Painful, yes—but this is critical data for your evolution. You pinpointed the exact behavior that broke you."
- Resilience Frame: "Every champion's story has days like this written in red. You're turning the page, not closing the book."
- Awareness Weapon: "You caught your overtrading and heavy sizing. That awareness today prevents a disaster tomorrow."
- Bounce-Back Anchor: "This loss stings now, but it's sharpening your edge. Tomorrow you come back stronger, with lessons most never learn."

⚡ Execution Goal
- For Green Days: Highlight execution and mastery.
- For Red Days: Highlight journaling courage and resilience.
- Rotate tone styles so no two entries feel the same.
- Always paraphrase, adapt, and tie into the trader's actual notes/screenshots.
- Always end with a strong motivational punchline.

CRITICAL: Never copy rotation bank examples word-for-word. Always paraphrase and personalize based on the actual trade data provided. If you find yourself using similar phrasing to any bank example, rewrite it completely while maintaining the motivational tone and core message.

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
