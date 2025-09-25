

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  entryId: string;
  customPrompt?: string;
}

interface TradeJournalEntry {
  id: string;
  user_id: string;
  asset_ticker: string;
  pnl: number;
  trade_date: string;
  notes?: string;
  screenshot_url?: string;
  entry_price?: number;
  exit_price?: number;
  position_size?: number;
  trade_type?: string;
}

interface CoachingAnalysis {
  execution_analysis: string;
  risk_management: string;
  strengths: string;
  improvements: string;
  recommendations: string;
  overall_score: number;
  key_insights: string[];
}

serve(async (req) => {
  console.log('Trading Journal AI Coach function started');
  console.log('Request method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

    console.log('Environment variables loaded');
    console.log('Has Google API Key:', !!googleApiKey);

    if (!googleApiKey) {
      console.error('Google API key not configured');
      throw new Error('Google API key not configured');
    }

    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { entryId, customPrompt }: RequestBody = await req.json();
    console.log('Processing entry:', entryId);

    if (!entryId) {
      return new Response(
        JSON.stringify({ error: 'Entry ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the trade journal entry
    const { data: entry, error: entryError } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (entryError || !entry) {
      console.error('Entry not found:', entryError);
      return new Response(
        JSON.stringify({ error: 'Trade entry not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Entry found:', entry.asset_ticker);

    // Fetch recent entries for context (last 5 entries)
    const { data: recentEntries } = await supabase
      .from('trade_journal_entries')
      .select('asset_ticker, pnl, trade_date, trade_type')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: false })
      .limit(5);

    // Check if coaching already exists
    const { data: existingCoaching } = await supabase
      .from('ai_coach_feedback')
      .select('*')
      .eq('journal_entry_id', entryId)
      .eq('user_id', user.id)
      .single();

    if (existingCoaching) {
      console.log('Returning cached coaching feedback');
      return new Response(
        JSON.stringify({
          success: true,
          feedback: existingCoaching,
          cached: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build comprehensive prompt
    const prompt = buildCoachingPrompt(entry, recentEntries || [], customPrompt);
    console.log('Calling Gemini API...');

    // Make direct HTTP call to Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    
    if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
      console.error('Invalid Gemini response structure:', geminiData);
      throw new Error('Invalid response from Gemini API');
    }

    const analysisText = geminiData.candidates[0].content.parts[0].text;
    console.log('Gemini API response received, parsing...');

    // Parse the AI response to structured format
    const coachingAnalysis = parseCoachingResponse(analysisText);

    // Store the coaching feedback
    const { data: savedFeedback, error: saveError } = await supabase
      .from('ai_coach_feedback')
      .insert({
        user_id: user.id,
        journal_entry_id: entryId,
        coaching_analysis: coachingAnalysis,
        feedback_type: 'gemini_coach',
        model_used: 'gemini-1.5-flash'
      })
      .select('*')
      .single();

    if (saveError) {
      console.error('Error saving coaching feedback:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save coaching feedback' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Coaching feedback saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        feedback: savedFeedback,
        cached: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in trading journal AI coach:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildCoachingPrompt(entry: TradeJournalEntry, recentEntries: any[], customPrompt?: string): string {
  const contextEntries = recentEntries.map(e => 
    `${e.trade_date}: ${e.asset_ticker} ${e.trade_type || 'unknown'} P&L: ${e.pnl}`
  ).join('\n');

  return `As an expert trading coach, provide comprehensive analysis for this trade:

**Current Trade:**
Asset: ${entry.asset_ticker}
P&L: ${entry.pnl}
Date: ${entry.trade_date}
Entry Price: ${entry.entry_price || 'N/A'}
Exit Price: ${entry.exit_price || 'N/A'}
Position Size: ${entry.position_size || 'N/A'}
Trade Type: ${entry.trade_type || 'N/A'}
Notes: ${entry.notes || 'None'}

**Recent Trading Context:**
${contextEntries || 'No recent trades available'}

${customPrompt ? `**Custom Analysis Request:** ${customPrompt}` : ''}

Please provide analysis in this exact JSON format:
{
  "execution_analysis": "Detailed analysis of trade execution timing, entry/exit points",
  "risk_management": "Assessment of risk management practices used",
  "strengths": "Key strengths demonstrated in this trade",
  "improvements": "Specific areas for improvement",
  "recommendations": "3-5 actionable recommendations for future trades",
  "overall_score": (1-10 numeric score),
  "key_insights": ["insight1", "insight2", "insight3"]
}

Focus on practical, actionable advice. Be specific about what worked well and what could be improved. Consider the trader's recent performance patterns.`;
}

function parseCoachingResponse(responseText: string): CoachingAnalysis {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        execution_analysis: parsed.execution_analysis || 'Analysis not available',
        risk_management: parsed.risk_management || 'Risk assessment not available',
        strengths: parsed.strengths || 'Strengths analysis not available',
        improvements: parsed.improvements || 'Improvements not available',
        recommendations: parsed.recommendations || 'Recommendations not available',
        overall_score: parsed.overall_score || 5,
        key_insights: parsed.key_insights || []
      };
    }
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
  }

  // Fallback: create structured analysis from text
  return {
    execution_analysis: responseText.substring(0, 500),
    risk_management: 'Unable to parse detailed risk analysis',
    strengths: 'Unable to parse strengths analysis',
    improvements: 'Unable to parse improvement suggestions',
    recommendations: 'Please review the full analysis text',
    overall_score: 5,
    key_insights: ['Analysis requires manual review']
  };
}

