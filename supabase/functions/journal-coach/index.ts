import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { callGoogleAIWithMeta, GoogleAIMeta } from '../_shared/google-ai-helper.ts';

// Data structures for metrics and requests
interface JournalCoachRequest {
  journal_entry_id: string;
}

interface GenerationMetrics {
  fallback_reason: string | null;
  path_chosen: string; // "primary" | "backup" | "deterministic"
  model_used: string;
  salvaged_from_max_tokens: boolean;
  was_clamped: boolean;
  tokens_out: string | number;
  finish_reason: string | null;
  model_latency_ms: number;
  used_retry: boolean;
  notes_len: number;
  notes_trunc_len: number;
  prompt_char_len: number;
  final_feedback_len: number;
  primary_ms?: number;
  backup_ms?: number;
  timed_out: boolean;
  quality_passed: boolean;
  quality_reason?: string;
}

// Feature flags with defaults
const JOURNAL_COACH_PRIMARY_SLA_MS = parseInt(Deno.env.get('JOURNAL_COACH_PRIMARY_SLA_MS') || '3000');
const JOURNAL_COACH_ENABLE_BACKUP = Deno.env.get('JOURNAL_COACH_ENABLE_BACKUP') !== 'false';
const JOURNAL_COACH_REQUIRE_KEYWORD = Deno.env.get('JOURNAL_COACH_REQUIRE_KEYWORD') !== 'false';

// Updated prompts with explicit instructions
const PLAIN_TEXT_SYSTEM_PROMPT = "You are an encouraging trading coach. Give motivational feedback in 2-3 sentences (≤500 characters). Be positive and constructive. Reference one idea from the trader's notes and the asset if relevant. Plain text only; no JSON.";
const BACKUP_SYSTEM_PROMPT = "You are a trading coach. Provide brief, encouraging feedback (120-500 characters). Reference the asset or one concept from notes. Be positive and specific.";

// Quality gate keywords for trade analysis
const QUALITY_KEYWORDS = [
  "FVG", "equal highs", "equal lows", "TP", "SL", "entry", "exit", 
  "liquidity", "reversal", "continuation", "support", "resistance",
  "breakout", "pullback", "momentum", "trend", "volume"
];

function buildPlainTextPrompt(notes: string, asset: string, pnl: number): string {
  const outcome = pnl >= 0 ? "winning" : "losing";
  const truncatedNotes = notes.length > 500 ? notes.substring(0, 500) + "..." : notes;
  
  return `${PLAIN_TEXT_SYSTEM_PROMPT}

Trade: ${outcome} trade on ${asset} (P&L: ${pnl})
Notes: ${truncatedNotes}`;
}

function buildBackupPrompt(notes: string, asset: string, pnl: number): string {
  const outcome = pnl >= 0 ? "win" : "loss";
  const truncatedNotes = notes.length > 200 ? notes.substring(0, 200) + "..." : notes;
  
  return `${BACKUP_SYSTEM_PROMPT}

${outcome} on ${asset}: ${truncatedNotes}`;
}

function clampAndSanitize(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== 'string') return '';
  
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength - 3) + '...';
  }
  
  return cleaned;
}

function isTransportFallback(text: string): boolean {
  try {
    const parsed = JSON.parse(text);
    return parsed.is_fallback === true;
  } catch {
    return false;
  }
}

function checkQualityGates(text: string, asset: string, notes: string): { passed: boolean; reason?: string } {
  if (!text || text.length < 60) {
    return { passed: false, reason: 'too-short-<60' };
  }
  
  if (text.length < 120) {
    return { passed: false, reason: 'too-short-<120' };
  }
  
  const textLower = text.toLowerCase();
  const assetLower = asset.toLowerCase();
  
  // Check for asset mention
  const hasAsset = textLower.includes(assetLower);
  
  // Check for keyword mentions
  const hasKeyword = QUALITY_KEYWORDS.some(keyword => 
    textLower.includes(keyword.toLowerCase())
  );
  
  if (JOURNAL_COACH_REQUIRE_KEYWORD) {
    if (!hasAsset && !hasKeyword) {
      return { passed: false, reason: 'no-asset-no-keyword' };
    }
  } else {
    if (!hasAsset) {
      return { passed: false, reason: 'no-asset-mention' };
    }
  }
  
  return { passed: true };
}

function createDeterministicFallback(asset: string, pnl: number): string {
  const outcome = pnl >= 0 ? "winning" : "losing";
  const encouragement = pnl >= 0 
    ? "Great execution on this trade! Your discipline and analysis paid off."
    : "Every trade is a learning opportunity. Review your entry and risk management for future improvement.";
  
  return `Nice work analyzing your ${outcome} ${asset} trade. ${encouragement} Keep documenting your process to build consistent trading habits.`;
}

// Track in-flight requests for deduplication
const inFlightRequests = new Map<string, Promise<{ text: string; meta: GoogleAIMeta }>>();

async function generateFeedbackRobust(
  notes: string,
  asset: string,
  pnl: number,
  apiKey: string,
  forceJson: boolean = false
): Promise<{ feedback: string; metrics: GenerationMetrics }> {
  const startTime = Date.now();
  const notesLen = notes.length;
  const notesTruncLen = notes.length > 500 ? 500 : notes.length;
  
  const metrics: GenerationMetrics = {
    fallback_reason: null,
    path_chosen: "primary",
    model_used: "gemini-2.5-flash",
    salvaged_from_max_tokens: false,
    was_clamped: false,
    tokens_out: 0,
    finish_reason: null,
    model_latency_ms: 0,
    used_retry: false,
    notes_len: notesLen,
    notes_trunc_len: notesTruncLen,
    prompt_char_len: 0,
    final_feedback_len: 0,
    timed_out: false,
    quality_passed: false
  };

  // Build primary prompt
  const primaryPrompt = forceJson 
    ? buildPlainTextPrompt(notes, asset, pnl) // Keep consistent for now
    : buildPlainTextPrompt(notes, asset, pnl);
  
  metrics.prompt_char_len = primaryPrompt.length;

  // Primary request setup
  const primaryController = new AbortController();
  let primaryStartTime = Date.now();
  
  const primaryOptions = {
    maxOutputTokens: 1000,
    timeoutMs: 15000,
    signal: primaryController.signal,
    temperature: 0.6,
    topP: 0.9,
    topK: 40,
    stopSequences: ["\n\n", "</end>"]
  };

  console.log('Journal Coach - Starting primary request (gemini-2.5-flash)');
  
  // Start primary request
  const primaryPromise = callGoogleAIWithMeta(
    apiKey,
    'gemini-2.5-flash',
    primaryPrompt,
    primaryOptions
  );

  // SLA timeout setup
  let slaTimeout: number | undefined;
  let backupPromise: Promise<{ text: string; meta: GoogleAIMeta }> | null = null;
  let slaFired = false;

  if (JOURNAL_COACH_ENABLE_BACKUP) {
    slaTimeout = setTimeout(() => {
      slaFired = true;
      metrics.timed_out = true;
      
      console.log('Journal Coach - Primary SLA exceeded, starting backup request');
      
      // Cancel primary request
      primaryController.abort();
      
      // Start backup request
      const backupPrompt = buildBackupPrompt(notes, asset, pnl);
      const backupStartTime = Date.now();
      
      backupPromise = callGoogleAIWithMeta(
        apiKey,
        'gemini-2.5-flash',
        backupPrompt,
        {
          maxOutputTokens: 750,
          timeoutMs: 12000,
          temperature: 0.6,
          topP: 0.9,
          topK: 40,
          stopSequences: ["\n\n", "</end>"]
        }
      ).then(result => {
        metrics.backup_ms = Date.now() - backupStartTime;
        return result;
      });
      
      metrics.path_chosen = "backup";
    }, JOURNAL_COACH_PRIMARY_SLA_MS);
  }

  try {
    let result: { text: string; meta: GoogleAIMeta };
    
    if (slaFired && backupPromise) {
      // Wait for backup
      result = await backupPromise;
      console.log('Journal Coach - backup request completed');
    } else {
      // Wait for primary
      result = await primaryPromise;
      metrics.primary_ms = Date.now() - primaryStartTime;
      
      // Clear SLA timeout since primary succeeded
      if (slaTimeout) {
        clearTimeout(slaTimeout);
      }
      
      console.log('Journal Coach - primary request completed');
    }

    metrics.model_latency_ms = Date.now() - startTime;
    metrics.tokens_out = result.meta.tokensOut;
    metrics.finish_reason = result.meta.finishReason;

    // Check if this is a transport fallback
    if (isTransportFallback(result.text)) {
      console.log('Journal Coach - received transport fallback, attempting model fallback');
      
      // Try model fallback to gemini-1.5-flash
      const fallbackStartTime = Date.now();
      const fallbackResult = await callGoogleAIWithMeta(
        apiKey,
        'gemini-1.5-flash',
        buildBackupPrompt(notes, asset, pnl),
        {
          maxOutputTokens: 750,
          timeoutMs: 10000,
          temperature: 0.6,
          topP: 0.9
        }
      );
      
      metrics.model_used = "gemini-1.5-flash";
      metrics.model_latency_ms = Date.now() - fallbackStartTime;
      metrics.path_chosen = "backup";
      metrics.used_retry = true;
      
      if (!isTransportFallback(fallbackResult.text)) {
        result = fallbackResult;
        metrics.tokens_out = result.meta.tokensOut;
        metrics.finish_reason = result.meta.finishReason;
      } else {
        // Use deterministic fallback
        const deterministicFeedback = createDeterministicFallback(asset, pnl);
        metrics.path_chosen = "deterministic";
        metrics.fallback_reason = "all_models_failed";
        metrics.final_feedback_len = deterministicFeedback.length;
        
        return {
          feedback: deterministicFeedback,
          metrics
        };
      }
    }

    // Clamp and sanitize the response
    let finalFeedback = clampAndSanitize(result.text, 500);
    metrics.was_clamped = finalFeedback.length < result.text.length;
    
    // Apply quality gates
    const qualityCheck = checkQualityGates(finalFeedback, asset, notes);
    metrics.quality_passed = qualityCheck.passed;
    metrics.quality_reason = qualityCheck.reason;
    
    if (!qualityCheck.passed && !metrics.used_retry) {
      console.log(`Journal Coach - quality check failed: ${qualityCheck.reason}, attempting retry`);
      
      // Single bounded retry with backup prompt
      const retryStartTime = Date.now();
      const retryResult = await callGoogleAIWithMeta(
        apiKey,
        'gemini-2.5-flash',
        buildBackupPrompt(notes, asset, pnl),
        {
          maxOutputTokens: 750,
          timeoutMs: 10000,
          temperature: 0.6,
          topP: 0.9,
          topK: 40,
          stopSequences: ["\n\n", "</end>"]
        }
      );
      
      metrics.used_retry = true;
      metrics.model_latency_ms += Date.now() - retryStartTime;
      
      if (!isTransportFallback(retryResult.text)) {
        const retryFeedback = clampAndSanitize(retryResult.text, 500);
        const retryQualityCheck = checkQualityGates(retryFeedback, asset, notes);
        
        if (retryQualityCheck.passed) {
          finalFeedback = retryFeedback;
          metrics.quality_passed = true;
          metrics.quality_reason = undefined;
          metrics.tokens_out = retryResult.meta.tokensOut;
          metrics.finish_reason = retryResult.meta.finishReason;
          
          console.log('Journal Coach - retry request succeeded with quality gates');
        } else {
          console.log(`Journal Coach - retry also failed quality: ${retryQualityCheck.reason}`);
          // Use deterministic fallback
          finalFeedback = createDeterministicFallback(asset, pnl);
          metrics.path_chosen = "deterministic";
          metrics.fallback_reason = "quality_gates_failed";
        }
      } else {
        // Retry was transport fallback, use deterministic
        finalFeedback = createDeterministicFallback(asset, pnl);
        metrics.path_chosen = "deterministic";
        metrics.fallback_reason = "retry_transport_fallback";
      }
    } else if (!qualityCheck.passed && metrics.used_retry) {
      // Already retried, use deterministic fallback
      finalFeedback = createDeterministicFallback(asset, pnl);
      metrics.path_chosen = "deterministic";
      metrics.fallback_reason = "quality_gates_failed_after_retry";
    }
    
    metrics.final_feedback_len = finalFeedback.length;
    
    console.log(`Journal Coach - Generation complete:`, {
      fallback_reason: metrics.fallback_reason,
      path_chosen: metrics.path_chosen,
      model_used: metrics.model_used,
      salvaged_from_max_tokens: metrics.salvaged_from_max_tokens,
      was_clamped: metrics.was_clamped,
      tokens_out: String(metrics.tokens_out),
      finish_reason: metrics.finish_reason,
      model_latency_ms: metrics.model_latency_ms,
      used_retry: metrics.used_retry,
      notes_len: metrics.notes_len,
      notes_trunc_len: metrics.notes_trunc_len,
      prompt_char_len: metrics.prompt_char_len,
      final_feedback_len: metrics.final_feedback_len,
      timed_out: metrics.timed_out,
      quality_passed: metrics.quality_passed,
      quality_reason: metrics.quality_reason
    });

    return {
      feedback: finalFeedback,
      metrics
    };

  } catch (error) {
    // Clear timeout on error
    if (slaTimeout) {
      clearTimeout(slaTimeout);
    }
    
    console.error('Journal Coach - Generation failed with error:', error);
    
    // Use deterministic fallback
    const deterministicFeedback = createDeterministicFallback(asset, pnl);
    metrics.path_chosen = "deterministic";
    metrics.fallback_reason = "generation_error";
    metrics.model_latency_ms = Date.now() - startTime;
    metrics.final_feedback_len = deterministicFeedback.length;
    
    return {
      feedback: deterministicFeedback,
      metrics
    };
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Main handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const requestBody = await req.json();
    const { journal_entry_id } = requestBody as JournalCoachRequest;

    if (!journal_entry_id) {
      return new Response(
        JSON.stringify({ error: 'Missing journal_entry_id parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check for in-flight request (idempotency)
    if (inFlightRequests.has(journal_entry_id)) {
      console.log(`Journal Coach - Request already in flight for entry: ${journal_entry_id}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Request already in progress for this journal entry' 
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Journal Coach - Processing request:`, {
      user_id: user.id,
      journal_entry_id
    });

    // Get journal entry
    const { data: journalEntry, error: journalError } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .eq('id', journal_entry_id)
      .eq('user_id', user.id)
      .single();

    if (journalError || !journalEntry) {
      return new Response(
        JSON.stringify({ error: 'Journal entry not found or access denied' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if feedback already exists
    if (journalEntry.ai_positive_feedback && journalEntry.ai_positive_feedback.trim()) {
      console.log(`Journal Coach - Feedback already exists for entry: ${journal_entry_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          reply: journalEntry.ai_positive_feedback,
          cached: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get API key
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google AI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const notes = journalEntry.notes || '';
    const asset = journalEntry.asset_ticker || 'Unknown';
    const pnl = journalEntry.pnl || 0;

    console.log(`Journal Coach - Trade analysis:`, {
      outcome: pnl >= 0 ? 'winning trade' : 'losing trade',
      pnl,
      notes_len: notes.length
    });

    // Create generation promise and track it
    const generationPromise = generateFeedbackRobust(notes, asset, pnl, googleApiKey);
    inFlightRequests.set(journal_entry_id, generationPromise as any);

    try {
      // Generate feedback
      const { feedback, metrics } = await generationPromise;

      // Update journal entry
      const { error: updateError } = await supabase
        .from('trade_journal_entries')
        .update({ ai_positive_feedback: feedback })
        .eq('id', journal_entry_id);

      if (updateError) {
        console.error('Journal Coach - Failed to update journal entry:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to save feedback' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log('Journal Coach - Successfully updated journal entry with feedback');

      // Log to agent outputs
      await supabase
        .from('agent_outputs')
        .insert({
          user_id: user.id,
          agent_name: 'journal-coach',
          output_text: feedback,
          user_readable_text: feedback,
          metadata: {
            journal_entry_id,
            generation_metrics: metrics,
            feature_flags: {
              primary_sla_ms: JOURNAL_COACH_PRIMARY_SLA_MS,
              enable_backup: JOURNAL_COACH_ENABLE_BACKUP,
              require_keyword: JOURNAL_COACH_REQUIRE_KEYWORD
            }
          }
        });

      return new Response(
        JSON.stringify({
          success: true,
          reply: feedback,
          metrics,
          cached: false
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } finally {
      // Always cleanup in-flight tracking
      inFlightRequests.delete(journal_entry_id);
    }

  } catch (error) {
    console.error('Journal Coach - Request failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});