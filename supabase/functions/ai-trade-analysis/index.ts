
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert image URL to base64
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

// Calculate trading metrics and patterns
function calculateTradingMetrics(trades: any[]) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      journalingStreak: 0,
      recentConsistency: 0,
      totalPnL: 0,
      avgTradeSize: 0
    };
  }

  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const avgTradeSize = totalTrades > 0 ? Math.abs(totalPnL / totalTrades) : 0;

  // Calculate journaling streak (consecutive days with trades)
  const sortedTrades = trades.sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());
  let journalingStreak = 0;
  let currentDate = new Date();
  
  for (const trade of sortedTrades) {
    const tradeDate = new Date(trade.trade_date);
    const daysDiff = Math.floor((currentDate.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= journalingStreak + 1) {
      journalingStreak++;
      currentDate = tradeDate;
    } else {
      break;
    }
  }

  // Recent consistency (last 7 trades)
  const recentTrades = sortedTrades.slice(0, 7);
  const recentConsistency = recentTrades.length;

  return {
    totalTrades,
    winRate,
    journalingStreak,
    recentConsistency,
    totalPnL,
    avgTradeSize
  };
}

// Determine trader archetype based on patterns
function determineTraderArchetype(trades: any[], metrics: any) {
  if (metrics.totalTrades < 5) return "developing";
  
  if (metrics.winRate >= 60 && metrics.journalingStreak >= 7) return "disciplined";
  if (metrics.recentConsistency >= 5) return "consistent";
  if (metrics.totalTrades >= 20) return "experienced";
  if (metrics.journalingStreak >= 3) return "systematic";
  
  return "growing";
}

// Generate milestone recognition
function generateMilestones(metrics: any) {
  const milestones = [];
  
  if (metrics.totalTrades === 1) milestones.push("🎉 First trade logged!");
  if (metrics.totalTrades === 10) milestones.push("🎯 10 trades milestone!");
  if (metrics.totalTrades === 50) milestones.push("🚀 50 trades milestone!");
  if (metrics.totalTrades === 100) milestones.push("👑 100 trades milestone!");
  
  if (metrics.journalingStreak >= 3) milestones.push(`🔥 ${metrics.journalingStreak}-day journaling streak!`);
  if (metrics.journalingStreak >= 7) milestones.push("📈 One week of consistent journaling!");
  if (metrics.journalingStreak >= 30) milestones.push("💎 One month of trading discipline!");
  
  if (metrics.winRate >= 60 && metrics.totalTrades >= 10) milestones.push("🎯 Strong win rate achieved!");
  
  return milestones;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not set');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { prompt, file_urls, user_id } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Fetch user's trading history and profile for context
    let tradingHistory = [];
    let userProfile = null;
    
    if (user_id) {
      console.log('Fetching trading context for user:', user_id);
      
      // Get recent trading history (last 30 trades)
      const { data: trades } = await supabase
        .from('trade_journal_entries')
        .select('*')
        .eq('user_id', user_id)
        .order('trade_date', { ascending: false })
        .limit(30);
      
      if (trades) tradingHistory = trades;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, trader_level, created_at')
        .eq('id', user_id)
        .single();
      
      if (profile) userProfile = profile;
    }

    // Calculate trading metrics and patterns
    const metrics = calculateTradingMetrics(tradingHistory);
    const traderArchetype = determineTraderArchetype(tradingHistory, metrics);
    const milestones = generateMilestones(metrics);

    console.log('Trading metrics calculated:', { metrics, traderArchetype, milestones: milestones.length });

    // Build enhanced coaching prompt
    const coachingContext = `
    TRADING COACH PERSONALITY: You are an encouraging, supportive trading mentor focused on building trader confidence and identity. Your role is to motivate, celebrate progress, and provide constructive feedback that builds consistency.

    USER CONTEXT:
    - Trader Name: ${userProfile?.display_name || 'Trader'}
    - Experience Level: ${userProfile?.trader_level || 'Developing'}
    - Total Trades Logged: ${metrics.totalTrades}
    - Current Win Rate: ${metrics.winRate.toFixed(1)}%
    - Journaling Streak: ${metrics.journalingStreak} days
    - Trading Archetype: ${traderArchetype} trader
    - Recent Milestones: ${milestones.join(', ') || 'Building foundations'}

    COACHING STRUCTURE:
    1. CELEBRATION (Start with congratulations for logging the trade)
    2. RECOGNITION (Acknowledge streaks, milestones, positive patterns)
    3. INSIGHTS (Technical analysis framed positively as growth opportunities)
    4. IDENTITY BUILDING (Reinforce trader archetype development)
    5. ENCOURAGEMENT (Motivational close with forward momentum)

    COACHING PRINCIPLES:
    - Focus on PROCESS over outcomes
    - Celebrate CONSISTENCY over perfection
    - Build IDENTITY as a disciplined trader
    - Frame losses as LEARNING opportunities
    - Recognize EFFORT and commitment to journaling
    - Use "You're becoming..." language for identity reinforcement
    - Maintain encouraging tone regardless of P&L

    CURRENT TRADE ANALYSIS REQUEST: ${prompt}
    `;

    // Prepare content parts for Gemini API
    const parts = [
      {
        text: coachingContext
      }
    ];

    // Add images if provided
    if (file_urls && file_urls.length > 0) {
      console.log('Processing', file_urls.length, 'images for enhanced coaching analysis');
      
      for (const url of file_urls) {
        try {
          const base64Data = await imageUrlToBase64(url);
          parts.push({
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Data
            }
          });
        } catch (error) {
          console.error('Failed to process image:', url, error);
        }
      }
    }

    console.log('Calling Gemini API for enhanced coaching analysis');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.8, // Higher creativity for motivational content
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2500, // More tokens for comprehensive coaching
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Unexpected Gemini response structure:', data);
      throw new Error('Invalid response from Gemini API');
    }

    const coachingFeedback = data.candidates[0].content.parts[0].text;

    console.log('Enhanced AI coaching analysis completed successfully');

    return new Response(JSON.stringify({ 
      result: coachingFeedback,
      metrics: metrics,
      milestones: milestones,
      traderArchetype: traderArchetype
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced ai-trade-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate coaching feedback',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
