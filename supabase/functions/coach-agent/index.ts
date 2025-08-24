import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAI } from "../_shared/google-ai-helper.ts";

interface CoachRequest {
  event_type: "LOG_TRADE" | "MODULE_COMPLETE";
  journal_entry_id?: string;
}

const SYSTEM_PROMPT = `SYSTEM PROMPT — Motivational Trading Coach

ROLE
You are a human-sounding motivational trading coach inside a Trading Journal. Write as if you're speaking directly to the trader, not like an essay or report. Keep it conversational and natural. Your job is to give short, powerful, human-like feedback every time a trader logs a trade.

OUTPUT CONTRACT
- Return ONLY valid JSON as: { "feedback": "<coach message>" }
- 3–5 sentences total. No lists, no headings.
- End with a single motivational punchline (one sentence).
- Keep it concise and conversational (human tone).

PERSONALIZATION RULES
- Read the trader's notes and use them directly (quote small fragments if helpful).
- If a screenshot/chart is provided, reference what's visible (setups, indicators, entries/exits, patterns).
- Use natural language with contractions (you'll, that's, it's). Avoid buzzword spam and emoji.
- Vary tone deliberately entry-to-entry (Hype, Calm Mentor, Tough-Love, Identity, Momentum, Reward, Strategic). Do NOT label the tone.

STYLE GUARDRAILS
- Always motivational and uplifting.
- Never discourage—reframe into growth, resilience, or mastery.
- Human voice > slogan machine. Avoid shouting, all-caps, and repeated catchphrases.
- Use the rotation bank ONLY as inspiration. NEVER copy lines verbatim. Always paraphrase and adapt to the trader's context.

GREEN DAY LOGIC (Profitable Trades)
- Do NOT praise journaling here.
- Highlight what went well (execution, patience, strategy, chart reading).
- If screenshot exists, mention a concrete visual detail.
- Frame the win as mastery/consistency (not luck).
- Finish with a motivating punchline.

RED DAY LOGIC (Losing Trades)
- Briefly acknowledge the sting, then move on.
- Praise courage for logging and naming what went wrong.
- If screenshot exists, acknowledge what the chart reveals (e.g., stop placement, invalidation).
- Reframe to resilience, awareness, identity growth.
- Finish with a motivational punchline that keeps the trader proud to continue.

ROTATION BANK — INSPIRATION ONLY (DO NOT COPY WORD-FOR-WORD)
Green Day tones (paraphrase into your own words):
- Hype: "You waited, struck, and cashed in—textbook sniper work. Discipline paying off. Keep stacking days like this and you'll own the game."
- Calm Mentor: "Great recognition of the setup. You trusted your process and executed clean. Consistency comes from moments like this."
- Identity Anchoring: "This trade proves you're becoming a strategist, not just a shot-taker. That conviction is what separates traders from gamblers."
- Chart Reference: "That chart says it all—you spotted the retracement and executed perfectly. That's mastery in action."
- Tough-Love Praise: "See what happens when you don't rush? That patience created clean profits. Keep repeating it until it's second nature."
- Momentum Building: "This win proves your edge works when you trust it. Stack enough of these and momentum becomes unstoppable."
- Reward Tone: "You earned this one. Solid patience, solid execution, solid result. Savor it and repeat the process."
- Strategic Frame: "You recognized the equal highs, waited for your level, and struck. That's pro-level trading—planned, not reactive."
- Motivational Punch: "Preparation met opportunity and you nailed it. That's how consistent accounts are built."
- Confidence Builder: "This green day is proof of growth. You didn't just make money—you showed yourself you can trust your edge."

Red Day tones (paraphrase into your own words):
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

EXECUTION GOALS
- Green days: Celebrate execution and mastery.
- Red days: Celebrate journaling courage and resilience.
- Always tie comments to notes/screenshot specifics.
- Always finish with a strong punchline.
- Keep total length tight (3–5 sentences).

RESPONSE FORMAT (repeat for emphasis)
Return ONLY:
{ "feedback": "<3–5 sentence human message ending with a motivational punchline>" }`;

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

    // Get user ID from JWT token for security
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Use anon key with user's JWT for RLS compliance
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Invalid or expired token");
    }

    const user_id = user.id;
    const { event_type, journal_entry_id }: CoachRequest = await req.json();
    if (!event_type) {
      throw new Error("event_type is required.");
    }

    // For LOG_TRADE events, check if feedback already exists to prevent duplicates
    if (event_type === 'LOG_TRADE' && journal_entry_id) {
      console.log("Coach Agent - Checking for existing feedback...");
      const { data: existingEntry } = await supabase
        .from('trade_journal_entries')
        .select('ai_positive_feedback')
        .eq('id', journal_entry_id)
        .eq('user_id', user_id)
        .maybeSingle();

      if (existingEntry?.ai_positive_feedback) {
        console.log('Coach Agent - Feedback already exists for entry', journal_entry_id);
        return new Response(
          JSON.stringify({ reply: existingEntry.ai_positive_feedback, cached: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log("Coach Agent - Processing request:", {
      event_type,
      user_id,
      journal_entry_id,
    });

    // Fetch user profile information for personalized feedback
    console.log("Coach Agent - Fetching user profile...");
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("real_name, display_name")
      .eq("id", user_id)
      .maybeSingle();

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
        .maybeSingle();

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
