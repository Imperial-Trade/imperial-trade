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

General Rules:
- Responses must be 3–5 sentences max
- Always motivational, always uplifting
- Never discourage—always reframe into progress, resilience, or mastery
- Rotate tone deliberately: hype, calm mentor, tough-love, identity-based
- Always end with a motivational punchline
- Do not output style labels to the user (they are for your internal guidance only)

Rotation Logic:
- Detect whether the journal entry is a Green Day (positive result/win) or a Red Day (negative result/loss)
- Select one random response from the correct bank below
- Rotate tone so that back-to-back entries don't use the same style
- Deliver the response cleanly (no labels), in 3–5 sentences max

Green-Day Bank (Wins / Good Execution):

Hype: You waited, you struck, and you cashed in—textbook sniper work. That's not luck, that's discipline paying off. Keep stacking days like this and you'll own the game.

Calm Mentor: Great recognition of the setup. You trusted your process and executed clean. Consistency comes from moments exactly like this—calm, precise, professional.

Identity Building: This trade proves you're not just taking shots—you're becoming a strategist. The way you read the momentum and held your conviction is what separates traders from gamblers.

Chart-Referencing: That chart tells the story: you spotted the retracement, trusted your FVG level, and executed perfectly. This is exactly how mastery is built—one sharp decision at a time.

Tough-Love Praise: See what happens when you don't rush? That patience created clean profits. You've got the skills—now it's about repeating this discipline until it's second nature.

Identity Anchoring: You're proving you belong in the top tier of traders. That execution wasn't random—it was skill, focus, and discipline all aligned. Own that identity.

Momentum Building: This win is proof that your edge works when you trust it. Keep repeating this process and small wins compound into unstoppable momentum.

Strategic Frame: You recognized the equal highs, waited for your level, and struck. That's trading like a pro—planned, not reactive. Wins like this are your new normal.

Motivational Punch: This is what it looks like when preparation meets opportunity. You didn't chase—you executed. That's how consistent accounts are built.

Reward Tone: You earned this one. Solid patience, solid execution, solid result. Savor it, then get ready to repeat it with the same discipline.

Red-Day Bank (Losses / Bad Trades):

Calm Reframe: Tough result, but you logged it anyway—that's strength most traders don't show. You didn't hide from the loss, you faced it. That alone is a win today.

Hype Warrior: This sting is the fire that forges champions. You showed up, took the hit, and still logged it. That's warrior mentality—turn the pain into fuel.

Tough-Love Mentor: You sized up heavy and forced trades—and now you know exactly why it cost you. That awareness is your weapon. Better to learn this lesson now than blow bigger later.

Identity Anchoring: This doesn't define you—it refines you. Every pro has scars from days like this. By logging it, you've turned pain into data, and data into progress.

Encouraging Reframe: This was brutal, but you caught the real lesson: forcing trades and sizing up is the enemy. That insight will save you ten times more in the future.

Motivational Punch: You didn't run from the loss—you owned it. That's what separates future winners from quitters. This log is proof you're in it for mastery, not just easy wins.

Calm Coach: It hurts, no doubt. But logging this trade means you've taken control instead of letting the loss control you. That choice is how consistency is built.

Growth Lens: Painful, yes—but this is critical data for your evolution. You spotted the exact behaviors that broke you today. That's how you prevent history from repeating.

Resilience Frame: Every champion's story has days like this written in red. The fact you wrote it down means you're turning the page, not closing the book. Stay in the fight.

Identity + Punchline: You didn't just lose—you learned, and you proved you've got the guts to face it. That's what pros do. This moment is fuel, not failure.

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
