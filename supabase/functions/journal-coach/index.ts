import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAIWithMeta } from "../_shared/google-ai-helper.ts";
import { smartTruncateNotes, generatePersonalizedFallback } from "../_shared/coach-utils.ts";

interface JournalCoachRequest {
  journal_entry_id: string;
}

interface GenerationMetrics {
  fallback_reason: string | null;
  used_retry: boolean;
  notes_len: number;
  notes_trunc_len: number;
  prompt_char_len: number;
  model_latency_ms: number;
  final_feedback_len: number;
  tokens_out: string;
  finish_reason: string;
}

const JOURNAL_SYSTEM_PROMPT = `Trading Coach - Give motivational feedback in JSON format.

Rules:
- Return: {"feedback": "2-4 sentences max 120 chars"}
- Be encouraging and reference trader's notes
- End with motivational punchline
- Winning trades: praise execution, strategy
- Losing trades: praise courage to log, frame as learning
- Human tone with contractions (you're, that's, it's)

Examples:
Win: "Your patience paid off on EURUSD! That setup recognition shows real skill. You're becoming consistent!"
Loss: "Logging this GBPJPY loss shows courage. Every pro trader learns from setups like this. You're growing!"`;

// Build compact prompt for efficient token usage
const buildPrompt = (userName: string, outcome: string, asset: string, pnl: number, notes: string, hasScreenshot: boolean) => `
${userName} traded ${asset}: ${outcome} (${pnl} USD)
Notes: "${notes}"
${hasScreenshot ? "Screenshot attached." : ""}

${JOURNAL_SYSTEM_PROMPT}
Return JSON: {"feedback": "encouraging message"}`;

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
    
    // Build compact prompt using new efficient structure
    const singlePrompt = buildPrompt(
      userName,
      tradeOutcome,
      journalEntry.asset_ticker,
      pnlAmount,
      notes_trunc_1,
      !!journalEntry.screenshot_url
    );
    
    const startTime = Date.now();
    // Start with very conservative limits to avoid MAX_TOKENS
    let aiResult = await callGoogleAIWithMeta(apiKey, "gemini-2.5-flash", singlePrompt, {
      maxOutputTokens: 180,
      timeoutMs: 12000,
      responseSchema: {
        type: "object",
        properties: {
          feedback: { 
            type: "string",
            maxLength: 120
          }
        },
        required: ["feedback"]
      }
    });
    const modelLatencyMs = Date.now() - startTime;

    let usedRetry = false;
    let fallbackReason: string | null = null;
    let finalMeta = aiResult.meta;

    // Check if we got a transport fallback and retry once
    try {
      const parsedResponse = JSON.parse(aiResult.text);
      if (parsedResponse.is_fallback) {
        console.log("Journal Coach - First attempt failed, retrying...", parsedResponse);
        fallbackReason = parsedResponse.fallback_reason;
        
        // Retry with ultra-minimal prompt and aggressive limits
        const minimalPrompt = `Trading coach feedback for ${userName}'s ${tradeOutcome} (${pnlAmount} USD).
Asset: ${journalEntry.asset_ticker}
Notes: "${notes_trunc_2}"

Give encouraging 2-3 sentence feedback in JSON.
Return: {"feedback": "max 80 chars motivational message"}`;
        
        aiResult = await callGoogleAIWithMeta(apiKey, "gemini-2.5-flash", minimalPrompt, {
          maxOutputTokens: 120,
          timeoutMs: 8000,
          responseSchema: {
            type: "object",
            properties: {
              feedback: { 
                type: "string",
                maxLength: 80
              }
            },
            required: ["feedback"]
          }
        });
        usedRetry = true;
        finalMeta = aiResult.meta;
        
        // Check retry result
        const retryParsed = JSON.parse(aiResult.text);
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
        const parsedResponse = JSON.parse(aiResult.text);
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

    // Build typed metrics object to prevent undefined references
    const metrics: GenerationMetrics = {
      fallback_reason: fallbackReason,
      used_retry: usedRetry,
      notes_len: tradeNotes.length,
      notes_trunc_len: notes_trunc_2.length,
      prompt_char_len: usedRetry ? 
        `Trading coach feedback for ${userName}'s ${tradeOutcome} (${pnlAmount} USD).
Asset: ${journalEntry.asset_ticker}
Notes: "${notes_trunc_2}"

Give encouraging 2-3 sentence feedback in JSON.
Return: {"feedback": "max 80 chars motivational message"}`.length : singlePrompt.length,
      model_latency_ms: modelLatencyMs,
      final_feedback_len: finalFeedback.length,
      tokens_out: finalMeta.tokensOut || "unknown",
      finish_reason: finalMeta.finishReason || "unknown"
    };

    // Log metrics
    console.log("Journal Coach - Generation complete:", metrics);

    // CRITICAL: Always update trade_journal_entries.ai_positive_feedback FIRST to prevent UI hanging
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

    // Store agent output - wrap in try/catch to never let logging throw
    try {
      await supabase
        .from("agent_outputs")
        .insert({
          user_id,
          agent_name: "Journal Coach",
          output_text: JSON.stringify({ 
            feedback: finalFeedback, 
            ...metrics 
          }),
          user_readable_text: finalFeedback,
        });
    } catch (agentOutputError) {
      console.error("Journal Coach - Error storing agent output:", agentOutputError);
      // Continue execution - don't let logging errors break the response
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