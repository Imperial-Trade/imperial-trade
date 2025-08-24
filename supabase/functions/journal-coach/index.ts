import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAI } from "../_shared/google-ai-helper.ts";
import { smartTruncateNotes, generatePersonalizedFallback } from "../coach-agent/utils.ts";

interface JournalCoachRequest {
  journal_entry_id: string;
}

const JOURNAL_SYSTEM_PROMPT = `SYSTEM PROMPT — Motivational Trading Coach

ROLE
You are a human-sounding motivational trading coach. Write as if you're speaking directly to the trader. Keep it conversational and natural. Your job is to give short, powerful feedback for trade journal entries.

OUTPUT CONTRACT
- Return ONLY valid JSON as: { "feedback": "<coach message>" }
- 3–5 sentences total. No lists, no headings.
- End with a single motivational punchline (one sentence).
- Keep it concise and conversational (≤100 words).

PERSONALIZATION RULES
- Read the trader's notes and reference them directly.
- If a screenshot/chart is provided, reference what's visible.
- Use natural language with contractions. Avoid buzzword spam and emoji.
- Vary tone (Hype, Calm Mentor, Tough-Love, Identity, etc.). Do NOT label the tone.

STYLE GUARDRAILS
- Always motivational and uplifting.
- Never discourage—reframe into growth, resilience, or mastery.
- Human voice > slogan machine. Avoid all-caps and repeated catchphrases.

GREEN DAY LOGIC (Profitable Trades)
- Highlight what went well (execution, patience, strategy, chart reading).
- If screenshot exists, mention a concrete visual detail.
- Frame the win as mastery/consistency (not luck).
- Finish with a motivating punchline.

RED DAY LOGIC (Losing Trades)
- Briefly acknowledge the sting, then move on.
- Praise courage for logging and naming what went wrong.
- If screenshot exists, acknowledge what the chart reveals.
- Reframe to resilience, awareness, identity growth.
- Finish with a motivational punchline that keeps the trader proud to continue.

EXECUTION GOALS
- Green days: Celebrate execution and mastery.
- Red days: Celebrate journaling courage and resilience.
- Always tie comments to notes/screenshot specifics.
- Always finish with a strong punchline.
- Keep total length tight (3–5 sentences, ≤100 words).

RESPONSE FORMAT
Return ONLY: { "feedback": "<3–5 sentence human message ending with a motivational punchline>" }`;

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
    const { journal_entry_id }: JournalCoachRequest = await req.json();
    
    if (!journal_entry_id) {
      throw new Error("journal_entry_id is required.");
    }

    console.log("Journal Coach - Processing request:", { user_id, journal_entry_id });

    // Check if feedback already exists (idempotency)
    const { data: existingEntry } = await supabase
      .from('trade_journal_entries')
      .select('ai_positive_feedback')
      .eq('id', journal_entry_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingEntry?.ai_positive_feedback) {
      console.log('Journal Coach - Feedback already exists for entry', journal_entry_id);
      return new Response(
        JSON.stringify({ reply: existingEntry.ai_positive_feedback, cached: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user profile for personalization
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("real_name, display_name")
      .eq("id", user_id)
      .maybeSingle();

    const userName = userProfile?.display_name || userProfile?.real_name || "Trader";

    // Fetch trade journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from("trade_journal_entries")
      .select("asset_ticker, pnl, notes, entry_price, exit_price, position_size, trade_type, screenshot_url")
      .eq("id", journal_entry_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (journalError || !journalEntry) {
      throw new Error("Failed to fetch trade journal entry or entry not found");
    }

    // Analyze trade data
    const tradeOutcome = journalEntry.pnl > 0 ? "winning trade" : "losing trade";
    const pnlAmount = Math.abs(journalEntry.pnl);
    const tradeNotes = journalEntry.notes || "No notes provided";

    console.log("Journal Coach - Trade analysis:", {
      outcome: tradeOutcome,
      pnl: pnlAmount,
      notes_len: tradeNotes.length
    });

    // Smart truncation for token efficiency
    const notes_trunc_1 = smartTruncateNotes(tradeNotes, 1200);
    const notes_trunc_2 = smartTruncateNotes(tradeNotes, 800);
    
    // Build single compact prompt
    const singlePrompt = `${JOURNAL_SYSTEM_PROMPT}

--- TASK ---
${userName} submitted a ${tradeOutcome} with ${pnlAmount} USD ${journalEntry.pnl > 0 ? "profit" : "loss"}.
Asset: ${journalEntry.asset_ticker}
Trade Type: ${journalEntry.trade_type || "Not specified"}
Their notes: "${notes_trunc_1}"
${journalEntry.screenshot_url ? "They also uploaded a screenshot for analysis." : ""}

Provide a supportive coaching response that highlights specific concepts from their notes and validates their trading analysis skills.

Return JSON: {"feedback": "your 3-5 sentence message ending with motivational punchline"}`;

    const startTime = Date.now();
    let aiResponse = await callGoogleAI(apiKey, "gemini-2.5-flash", singlePrompt, {
      maxOutputTokens: 300,
      timeoutMs: 12000,
      responseSchema: {
        type: "object",
        properties: {
          feedback: { type: "string" }
        },
        required: ["feedback"],
        additionalProperties: false
      }
    });
    const modelLatencyMs = Date.now() - startTime;

    let usedRetry = false;
    let fallbackReason: string | null = null;

    // Check if we got a transport fallback and retry once
    try {
      const parsedResponse = JSON.parse(aiResponse);
      if (parsedResponse.is_fallback) {
        console.log("Journal Coach - First attempt failed, retrying...", parsedResponse);
        fallbackReason = parsedResponse.fallback_reason;
        
        // Retry with shorter notes and lower token limit
        const retryPrompt = singlePrompt
          .replace(notes_trunc_1, notes_trunc_2)
          .replace('Return JSON: {"feedback": "your 3-5 sentence message ending with motivational punchline"}',
                  'Return JSON: {"feedback": "your 3-5 sentence message (≤80 words) ending with motivational punchline"}');
        
        aiResponse = await callGoogleAI(apiKey, "gemini-2.5-flash", retryPrompt, {
          maxOutputTokens: 200,
          timeoutMs: 12000
        });
        usedRetry = true;
        
        // Check retry result
        const retryParsed = JSON.parse(aiResponse);
        if (retryParsed.is_fallback) {
          fallbackReason = retryParsed.fallback_reason;
        } else {
          fallbackReason = null; // Retry succeeded
        }
      }
    } catch (parseError) {
      console.error("Journal Coach - Failed to parse AI response:", parseError);
      fallbackReason = 'invalid_json';
    }

    // Generate final response (AI or personalized fallback)
    let finalFeedback: string;
    if (fallbackReason) {
      // Generate personalized deterministic fallback
      finalFeedback = generatePersonalizedFallback({
        userName,
        asset: journalEntry.asset_ticker,
        tradeType: journalEntry.trade_type,
        isWin: journalEntry.pnl > 0,
        pnlAmount,
        notes: tradeNotes,
        hasScreenshot: !!journalEntry.screenshot_url
      });
      console.log("Journal Coach - Using personalized fallback due to:", fallbackReason);
    } else {
      // Extract feedback from successful AI response
      try {
        const parsedResponse = JSON.parse(aiResponse);
        finalFeedback = parsedResponse.feedback || "Great work on analyzing this trade! Your detailed approach shows real growth as a trader.";
      } catch (parseError) {
        console.error("Journal Coach - Failed to parse successful AI response:", parseError);
        finalFeedback = generatePersonalizedFallback({
          userName,
          asset: journalEntry.asset_ticker,
          tradeType: journalEntry.trade_type,
          isWin: journalEntry.pnl > 0,
          pnlAmount,
          notes: tradeNotes,
          hasScreenshot: !!journalEntry.screenshot_url
        });
        fallbackReason = 'invalid_json';
      }
    }

    // Log metrics
    console.log("Journal Coach - Generation complete:", {
      fallback_reason: fallbackReason,
      used_retry: usedRetry,
      notes_len: tradeNotes.length,
      model_latency_ms: modelLatencyMs,
      final_feedback_len: finalFeedback.length
    });

    // Store agent output
    const { error: agentOutputError } = await supabase
      .from("agent_outputs")
      .insert({
        user_id,
        agent_name: "Journal Coach",
        output_text: JSON.stringify({ feedback: finalFeedback, fallback_reason, used_retry }),
        user_readable_text: finalFeedback,
      });

    if (agentOutputError) {
      console.error("Journal Coach - Error storing agent output:", agentOutputError);
    }

    // CRITICAL: Always update trade_journal_entries.ai_positive_feedback to prevent UI hanging
    const { error: updateError } = await supabase
      .from("trade_journal_entries")
      .update({ ai_positive_feedback: finalFeedback })
      .eq("id", journal_entry_id)
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Journal Coach - Error updating journal entry:", updateError);
      // Still return success but log the issue
      return new Response(
        JSON.stringify({
          reply: finalFeedback,
          success: true,
          note: "Generated feedback but database update failed"
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Journal Coach - Successfully updated journal entry with feedback");
    
    return new Response(
      JSON.stringify({ reply: finalFeedback, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Journal Coach - Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});