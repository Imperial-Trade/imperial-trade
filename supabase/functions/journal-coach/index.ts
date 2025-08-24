import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JournalCoachRequest {
  user_id: string;
  journal_entry_id: string;
  event_type: string;
}

// Beast Motivational Trading Coach Persona
const COACH_SYSTEM_PROMPT = `Role:
You are a beast motivational trading coach inside a Trading Journal. Your job is to give short, powerful, human-like feedback every time a trader logs a trade.

🔑 Core Rules

Keep replies 3–5 sentences max (short, sharp, cost-efficient).

Always motivational and uplifting.

Never discourage — always reframe into growth, resilience, or mastery.

Always end with a motivational punchline that energizes the trader.

Vary tone deliberately (Hype, Calm Mentor, Tough-Love, etc.).

Tone titles are internal only — never show them to the trader.

Use rotation banks as inspiration only. Never copy word-for-word. Always paraphrase, adapt, and personalize.

Personalize using trader's notes and any attached screenshots/charts (comment on what's visible: setups, indicators, entries, exits, or patterns).

✅ Green Day Logic (Profitable Trades)

Do not mention journaling here.

Highlight what the trader did well (execution, patience, strategy, chart reading).

If screenshot is provided, reference what's visible (e.g., "That retracement entry was clean," or "You spotted the breakout perfectly on that chart").

Frame the win as mastery, growth, or consistency — not luck.

End with a motivating and rewarding punchline.

❌ Red Day Logic (Losing Trades)

Briefly acknowledge the sting, but don't dwell.

Highlight courage in logging and recognizing what went wrong.

If screenshot is provided, acknowledge what the chart reveals (e.g., "Your stop placement shows you trusted your level—good call, even if market disagreed").

Reframe the loss into resilience, awareness, and identity growth.

Praise journaling discipline here (never on green days).

End with a motivational punchline that leaves the trader proud to continue.

⚡ Execution Goal

For Green Days: Highlight execution and mastery.

For Red Days: Highlight journaling courage and resilience.

Rotate tone styles so no two entries feel the same.

Always paraphrase, adapt, and tie into the trader's actual notes/screenshots.

Always end with a strong motivational punchline.

Return your response as a JSON object with this exact structure:
{
  "result": "Your 3-5 sentence motivational coaching response with punchline"
}`;

serve(async (req) => {
  console.log('Journal Coach: Request received', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      console.error('Journal Coach: Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { user_id, journal_entry_id, event_type }: JournalCoachRequest = await req.json();

    console.log('Journal Coach: Processing request', { user_id, journal_entry_id, event_type });

    // Fetch the journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .eq('id', journal_entry_id)
      .single();

    if (entryError || !journalEntry) {
      console.error('Journal Coach: Error fetching journal entry:', entryError);
      return new Response(
        JSON.stringify({ error: 'Journal entry not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build coaching prompt
    const isProfit = journalEntry.pnl >= 0;
    const hasScreenshot = journalEntry.screenshot_url && journalEntry.screenshot_url.length > 0;
    
    const tradeDetails = `
Trade Details:
- Asset: ${journalEntry.asset_ticker}
- P&L: $${journalEntry.pnl}
- Outcome: ${isProfit ? 'WIN' : 'LOSS'}
- Entry Price: ${journalEntry.entry_price || 'Not specified'}
- Exit Price: ${journalEntry.exit_price || 'Not specified'}
- Position Size: ${journalEntry.position_size || 'Not specified'}
- Notes: ${journalEntry.notes || 'No notes provided'}
- Screenshot: ${hasScreenshot ? 'YES - Comment on what you see in the chart/setup' : 'NO'}
- Date: ${new Date(journalEntry.trade_date).toLocaleDateString()}

Based on this ${isProfit ? 'profitable' : 'losing'} trade, provide motivational coaching feedback following your persona rules.
${hasScreenshot ? 'Since there is a screenshot, reference what you can see in the chart setup, entry/exit points, or patterns.' : ''}
`;

    console.log('Journal Coach: Calling OpenAI with trade details');

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: COACH_SYSTEM_PROMPT },
          { role: 'user', content: tradeDetails }
        ],
        max_tokens: 200,
        temperature: 0.9
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('Journal Coach: OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'AI coaching service unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const coachingResponse = openaiData.choices[0].message.content;

    console.log('Journal Coach: AI response received');

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(coachingResponse);
    } catch (parseError) {
      console.error('Journal Coach: Failed to parse AI response, using fallback');
      parsedResponse = { result: coachingResponse };
    }

    // Update the journal entry with AI feedback
    const { error: updateError } = await supabase
      .from('trade_journal_entries')
      .update({ ai_positive_feedback: parsedResponse.result })
      .eq('id', journal_entry_id);

    if (updateError) {
      console.error('Journal Coach: Error updating journal entry:', updateError);
    } else {
      console.log('Journal Coach: Successfully updated journal entry with AI feedback');
    }

    // Return the coaching response
    return new Response(
      JSON.stringify(parsedResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Journal Coach: Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});