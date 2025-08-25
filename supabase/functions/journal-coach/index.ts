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
  salvaged_from_max_tokens: boolean;
  was_clamped: boolean;
  path_chosen: 'primary' | 'backup' | 'model_fallback' | 'deterministic_fallback';
  backup_reason?: string;
  model_used: string;
}

// In-flight request tracking for idempotency
const inFlightRequests = new Map<string, Promise<any>>();

// Plain-text system prompt for text mode
const PLAIN_TEXT_SYSTEM_PROMPT = `You are an encouraging trading coach. Give motivational feedback in 2-3 sentences (≤500 characters). Be positive and constructive. Reference the trader's notes. End with encouragement. Do not return JSON. Return plain text only.`;

// Build plain-text prompt for text mode
const buildPlainTextPrompt = (userName: string, outcome: string, asset: string, pnl: number, notes: string, hasScreenshot: boolean) => `
Trading coach feedback for ${userName}'s ${outcome} (${pnl} USD).
Asset: ${asset}
Notes: "${notes}"
${hasScreenshot ? "Screenshot attached." : ""}

${PLAIN_TEXT_SYSTEM_PROMPT}`;

// Build retry prompt (even shorter)
const buildRetryPrompt = (userName: string, outcome: string, asset: string, pnl: number, notes: string) => `
${userName} traded ${asset}: ${outcome} (${pnl} USD)
Notes: "${notes}"

Give encouraging 2 sentences (≤200 chars). Plain text only, no JSON.`;

// Legacy JSON prompt (for rollback feature flag)
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

const buildLegacyJsonPrompt = (userName: string, outcome: string, asset: string, pnl: number, notes: string, hasScreenshot: boolean) => `
${userName} traded ${asset}: ${outcome} (${pnl} USD)
Notes: "${notes}"
${hasScreenshot ? "Screenshot attached." : ""}

${JOURNAL_SYSTEM_PROMPT}
Return JSON: {"feedback": "encouraging message"}`;

// Clamp and sanitize text response
function clampAndSanitize(text: string, maxLength: number = 500): { text: string; wasClamped: boolean } {
  // Normalize whitespace and trim
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Strip any stray code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  
  // Clamp to max length
  const wasClamped = cleaned.length > maxLength;
  if (wasClamped) {
    cleaned = cleaned.substring(0, maxLength).trim();
    // Try to end at a sentence boundary
    const lastPeriod = cleaned.lastIndexOf('.');
    const lastExclamation = cleaned.lastIndexOf('!');
    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation);
    if (lastSentenceEnd > maxLength * 0.7) {
      cleaned = cleaned.substring(0, lastSentenceEnd + 1);
    }
  }
  
  return { text: cleaned, wasClamped };
}

// Check if response is a transport fallback
function isTransportFallback(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    return parsed.is_fallback === true;
  } catch {
    return false;
  }
}

// Robust AI generation with hedged requests and model fallback
async function generateFeedbackRobust(
  apiKey: string, 
  userName: string, 
  tradeOutcome: string, 
  journalEntry: any, 
  pnlAmount: number, 
  notes_trunc_1: string, 
  notes_trunc_2: string,
  forceJsonMode: boolean
): Promise<{
  finalFeedback: string;
  metrics: Partial<GenerationMetrics>;
  wasClamped: boolean;
}> {
  const startTime = Date.now();
  let pathChosen: 'primary' | 'backup' | 'model_fallback' | 'deterministic_fallback' = 'deterministic_fallback';
  let modelUsed = 'none';
  let backupReason = '';
  let salvagedFromMaxTokens = false;
  let wasClamped = false;
  let finalMeta: any = {};

  // Helper function to validate AI response
  const isValidResponse = (text: string, meta: any): boolean => {
    // Accept ANY non-empty text that's not a transport fallback
    if (!text || text.trim().length === 0) return false;
    if (isTransportFallback(text)) return false;
    
    // For JSON mode, try to parse - but accept partial JSON too
    if (forceJsonMode) {
      try {
        const parsed = JSON.parse(text);
        return parsed.feedback && parsed.feedback.length > 10; // At least 10 chars
      } catch {
        // If it's not valid JSON but has substantial content, accept it anyway
        return text.length > 20;
      }
    }
    
    // For text mode, accept anything with reasonable length
    return text.length > 15; // Very generous threshold
  };

  // Primary request configuration
  const primaryConfig = forceJsonMode ? {
    prompt: buildLegacyJsonPrompt(userName, tradeOutcome, journalEntry.asset_ticker, pnlAmount, notes_trunc_1, !!journalEntry.screenshot_url),
    maxOutputTokens: 1000,
    timeoutMs: 15000,
    responseSchema: {
      type: "object",
      properties: {
        feedback: { type: "string", maxLength: 500 }
      },
      required: ["feedback"]
    }
  } : {
    prompt: buildPlainTextPrompt(userName, tradeOutcome, journalEntry.asset_ticker, pnlAmount, notes_trunc_1, !!journalEntry.screenshot_url),
    maxOutputTokens: 1000,
    timeoutMs: 15000
  };

  // Backup request configuration (more aggressive)
  const backupConfig = {
    prompt: buildRetryPrompt(userName, tradeOutcome, journalEntry.asset_ticker, pnlAmount, notes_trunc_2),
    maxOutputTokens: 750,
    timeoutMs: 12000
  };

  try {
    // Primary request with gemini-2.5-flash
    console.log("Journal Coach - Starting primary request (gemini-2.5-flash)");
    const primaryPromise = callGoogleAIWithMeta(
      apiKey, 
      "gemini-2.5-flash", 
      primaryConfig.prompt, 
      primaryConfig
    );

    // Start backup request after 2.5s delay
    const backupPromise = new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          console.log("Journal Coach - Starting backup request (shorter prompt)");
          const result = await callGoogleAIWithMeta(
            apiKey, 
            "gemini-2.5-flash", 
            backupConfig.prompt, 
            backupConfig
          );
          resolve({ result, source: 'backup' });
        } catch (error) {
          reject(error);
        }
      }, 2500); // 2.5 second delay
    });

    // Race primary vs backup
    const raceResult = await Promise.race([
      primaryPromise.then(result => ({ result, source: 'primary' })),
      backupPromise
    ]);

    const aiResult = (raceResult as any).result;
    const source = (raceResult as any).source;

    if (isValidResponse(aiResult.text, aiResult.meta)) {
      console.log(`Journal Coach - ${source} request succeeded`);
      pathChosen = source as 'primary' | 'backup';
      modelUsed = 'gemini-2.5-flash';
      finalMeta = aiResult.meta;
      
      // Check for MAX_TOKENS salvage
      if (aiResult.meta.finishReason === 'MAX_TOKENS') {
        salvagedFromMaxTokens = true;
        console.log("Journal Coach - Salvaged text from MAX_TOKENS");
      }

      // Process the successful response
      let finalFeedback: string;
      if (forceJsonMode) {
        try {
          const parsed = JSON.parse(aiResult.text);
          finalFeedback = parsed.feedback || aiResult.text; // Fallback to raw text if parsing fails
        } catch {
          // Accept raw text even in JSON mode if we can't parse
          finalFeedback = aiResult.text;
        }
      } else {
        finalFeedback = aiResult.text;
      }

      // Clamp and sanitize
      const clampResult = clampAndSanitize(finalFeedback, 500);
      finalFeedback = clampResult.text;
      wasClamped = clampResult.wasClamped;

      return {
        finalFeedback,
        metrics: {
          fallback_reason: null,
          path_chosen: pathChosen,
          model_used: modelUsed,
          salvaged_from_max_tokens: salvagedFromMaxTokens,
          was_clamped: wasClamped,
          tokens_out: finalMeta.tokensOut?.toString() || "unknown",
          finish_reason: finalMeta.finishReason || "unknown",
          model_latency_ms: Date.now() - startTime
        },
        wasClamped
      };
    } else {
      backupReason = `${source}_invalid_response`;
    }
  } catch (primaryError) {
    console.log("Journal Coach - Primary/backup failed, trying model fallback:", primaryError.message);
    backupReason = 'primary_backup_failed';
  }

  // Model fallback: try gemini-1.5-flash
  try {
    console.log("Journal Coach - Trying model fallback (gemini-1.5-flash)");
    const fallbackResult = await callGoogleAIWithMeta(
      apiKey,
      "gemini-1.5-flash",
      backupConfig.prompt,
      {
        maxOutputTokens: 500,
        timeoutMs: 10000
      }
    );

    if (isValidResponse(fallbackResult.text, fallbackResult.meta)) {
      console.log("Journal Coach - Model fallback succeeded");
      pathChosen = 'model_fallback';
      modelUsed = 'gemini-1.5-flash';
      finalMeta = fallbackResult.meta;

      const clampResult = clampAndSanitize(fallbackResult.text, 500);
      
      return {
        finalFeedback: clampResult.text,
        metrics: {
          fallback_reason: null,
          backup_reason,
          path_chosen: pathChosen,
          model_used: modelUsed,
          salvaged_from_max_tokens: fallbackResult.meta.finishReason === 'MAX_TOKENS',
          was_clamped: clampResult.wasClamped,
          tokens_out: fallbackResult.meta.tokensOut?.toString() || "unknown",
          finish_reason: fallbackResult.meta.finishReason || "unknown",
          model_latency_ms: Date.now() - startTime
        },
        wasClamped: clampResult.wasClamped
      };
    }
  } catch (fallbackError) {
    console.log("Journal Coach - Model fallback failed:", fallbackError.message);
  }

  // Ultimate fallback: deterministic response
  console.log("Journal Coach - All AI attempts failed, using deterministic fallback");
  const deterministicFeedback = generatePersonalizedFallback({
    userName,
    asset: journalEntry.asset_ticker,
    tradeType: journalEntry.trade_type,
    isWin: journalEntry.pnl > 0,
    pnlAmount,
    notes: journalEntry.notes || "No notes provided",
    hasScreenshot: !!journalEntry.screenshot_url
  });

  return {
    finalFeedback: deterministicFeedback,
    metrics: {
      fallback_reason: 'all_ai_failed',
      backup_reason,
      path_chosen: 'deterministic_fallback',
      model_used: 'none',
      salvaged_from_max_tokens: false,
      was_clamped: false,
      tokens_out: "0",
      finish_reason: "fallback",
      model_latency_ms: Date.now() - startTime
    },
    wasClamped: false
  };
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
    const notes_trunc_1 = smartTruncateNotes(tradeNotes, 800);
    const notes_trunc_2 = smartTruncateNotes(tradeNotes, 400);

    // Check feature flag for rollback to JSON mode
    const forceJsonMode = Deno.env.get("JOURNAL_COACH_FORCE_JSON") === "true";
    
    // Idempotency protection: prevent concurrent requests for same entry
    const requestKey = `${user_id}:${journal_entry_id}`;
    if (inFlightRequests.has(requestKey)) {
      console.log("Journal Coach - Request already in progress, returning cached result");
      const result = await inFlightRequests.get(requestKey);
      return new Response(
        JSON.stringify({ reply: result.finalFeedback, success: true, cached: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create and track the generation promise
    const generationPromise = generateFeedbackRobust(
      apiKey,
      userName,
      tradeOutcome,
      journalEntry,
      pnlAmount,
      notes_trunc_1,
      notes_trunc_2,
      forceJsonMode
    );

    inFlightRequests.set(requestKey, generationPromise);

    try {
      // Generate feedback using robust method
      const result = await generationPromise;
      const { finalFeedback, metrics } = result;

      // Build complete metrics object
      const completeMetrics: GenerationMetrics = {
        ...metrics,
        used_retry: metrics.path_chosen === 'backup',
        notes_len: tradeNotes.length,
        notes_trunc_len: metrics.path_chosen === 'backup' ? notes_trunc_2.length : notes_trunc_1.length,
        prompt_char_len: forceJsonMode ? 
          (metrics.path_chosen === 'backup' ? buildRetryPrompt(userName, tradeOutcome, journalEntry.asset_ticker, pnlAmount, notes_trunc_2).length : 
           buildLegacyJsonPrompt(userName, tradeOutcome, journalEntry.asset_ticker, pnlAmount, notes_trunc_1, !!journalEntry.screenshot_url).length) :
          (metrics.path_chosen === 'backup' ? buildRetryPrompt(userName, tradeOutcome, journalEntry.asset_ticker, pnlAmount, notes_trunc_2).length :
           buildPlainTextPrompt(userName, tradeOutcome, journalEntry.asset_ticker, pnlAmount, notes_trunc_1, !!journalEntry.screenshot_url).length),
        final_feedback_len: finalFeedback.length
      } as GenerationMetrics;

      // Log enhanced metrics
      console.log("Journal Coach - Generation complete:", completeMetrics);

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
              ...completeMetrics 
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

    } finally {
      // Clean up in-flight request tracking
      inFlightRequests.delete(requestKey);
    }

  } catch (error) {
    console.error("Journal Coach - Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});