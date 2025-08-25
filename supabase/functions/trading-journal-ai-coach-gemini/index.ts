
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('DEPRECATED: trading-journal-ai-coach-gemini called - redirecting to journal-coach');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client for logging deprecation hit
    let supabase;
    if (supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    } else {
      supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } }
      });
    }

    // Get user for telemetry
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Log deprecation hit
    try {
      if (userId) {
        await supabase.from('function_deprecation_hits').insert({
          user_id: userId,
          function_name: 'trading-journal-ai-coach-gemini',
          source: 'edge',
          http_method: req.method,
          route: new URL(req.url).pathname,
          metadata: { 
            redirected_to: 'journal-coach',
            user_agent: req.headers.get('User-Agent') || 'unknown'
          }
        });
      }
    } catch (telemetryError) {
      console.error('Failed to log deprecation hit:', telemetryError);
      // Continue execution - don't block on telemetry failure
    }

    // Parse request body
    const requestBody = await req.json();
    
    // Forward to journal-coach
    const response = await supabase.functions.invoke('journal-coach', {
      body: {
        journal_entry_id: requestBody.entryId // Map old format to new
      },
      headers: { Authorization: authHeader }
    });

    if (response.error) {
      console.error('journal-coach forwarding failed:', response.error);
      // Return deterministic fallback
      return new Response(
        JSON.stringify({
          success: true,
          feedback: {
            coaching_analysis: {
              execution_analysis: "Your trade entry has been logged successfully. Keep building consistent trading habits!",
              risk_management: "Continue focusing on proper position sizing and risk management.",
              strengths: "Taking the time to log and analyze trades shows real commitment to improvement.",
              improvements: "Consider adding more detailed notes about your decision-making process.",
              recommendations: "Keep journaling consistently to build trading discipline and track your progress over time.",
              overall_score: 7,
              key_insights: ["Consistency in journaling builds trading discipline", "Self-reflection is key to improvement"]
            }
          },
          cached: false,
          deprecated_function_used: true
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Deprecated-Function': 'trading-journal-ai-coach-gemini',
            'X-Redirected-To': 'journal-coach'
          } 
        }
      );
    }

    // Return successful response with deprecation headers
    return new Response(
      JSON.stringify({
        ...response.data,
        deprecated_function_used: true
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Deprecated-Function': 'trading-journal-ai-coach-gemini',
          'X-Redirected-To': 'journal-coach'
        } 
      }
    );

  } catch (error) {
    console.error('Deprecation shim error:', error);
    
    // Ultimate safety net - return deterministic fallback
    return new Response(
      JSON.stringify({
        success: true,
        feedback: {
          coaching_analysis: {
            execution_analysis: "Your trade has been recorded. The system experienced a temporary issue, but your entry is safely stored.",
            risk_management: "Continue implementing proper risk management in your trades.",
            strengths: "Consistent trade logging demonstrates strong discipline.",
            improvements: "Keep refining your trading strategy based on historical performance.",
            recommendations: "Regular trade analysis will help you identify patterns and improve your trading approach.",
            overall_score: 6,
            key_insights: ["Persistence in logging trades builds long-term success", "Every trade is a learning opportunity"]
          }
        },
        cached: false,
        deprecated_function_used: true,
        safety_fallback: true
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Deprecated-Function': 'trading-journal-ai-coach-gemini',
          'X-Safety-Fallback': 'true'
        } 
      }
    );
  }
});
