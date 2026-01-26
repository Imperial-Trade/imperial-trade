import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeAnalysisRequest {
  asset: string;
  pnl: number;
  notes: string;
  imageBase64?: string;
  direction?: string;
  outcome?: string;
  strategy?: string;
  emotion?: string;
  session?: string;
}

serve(async (req) => {
  console.log('Journal XX AI Analysis function started');
  console.log('Request method:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the Journal XX specific API key from Supabase secrets
    // Fallback to hardcoded key if environment variable is not set
    const geminiApiKey = Deno.env.get('JOURNAL_XX_GEMINI_KEY') || 'AIzaSyCO-7hyeiyJc8iYYqbXZ03jK4qZ1_ICf0Y';

    if (!geminiApiKey) {
      console.error('JOURNAL_XX_GEMINI_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: TradeAnalysisRequest = await req.json();
    const { asset, pnl, notes, imageBase64, direction, outcome, strategy, emotion, session } = body;

    console.log('Analyzing trade for asset:', asset);

    // Build the prompt (same as original geminiService)
    const promptText = `
      Analyze this trade deeply as an institutional trading mentor.
      
      **Trade Data:**
      - Asset: ${asset}
      - PnL: ${pnl}
      - Direction: ${direction || 'N/A'}
      - Outcome: ${outcome || 'N/A'}
      - Strategy: ${strategy || 'N/A'}
      - Session: ${session || 'N/A'}
      - Emotional State: ${emotion || 'N/A'}
      
      **Trader's Notes:** 
      "${notes}"
      
      **Task:**
      If an image is provided, analyze the chart structure in the context of the "${strategy}" strategy.
      
      Provide 3 specific insights in Markdown:
      1. **Setup Rating (1-10):** Evaluate the quality of the setup based on the "${strategy}" strategy and the outcome.
      2. **Psychology Check:** Analyze if the emotional state "${emotion}" impacted the execution or if the result ("${outcome}") reinforces bad habits.
      3. **Actionable Tip:** One strict, technical rule to improve this specific setup or mindset.
      
      **Constraints:**
      - Keep the tone professional, encouraging, but strict on discipline.
      - STRICTLY Limit your response to a maximum of 4-5 sentences total.
      - Do not ramble. Be precise.
    `;

    // Build the request parts
    const parts: any[] = [];

    // Add image if provided
    if (imageBase64) {
      // Strip the data:image/xyz;base64, prefix if present
      const base64Data = imageBase64.includes('base64,') 
        ? imageBase64.split('base64,')[1] 
        : imageBase64;

      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      });
    }

    // Add text prompt
    parts.push({ text: promptText });

    // Call Gemini API with system instruction
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          systemInstruction: {
            parts: [{
              text: "You are an elite, institutional-grade trading mentor. You value process over pnl."
            }]
          },
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
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    
    if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
      console.error('Invalid Gemini response structure:', geminiData);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysisText = geminiData.candidates[0].content.parts[0].text;
    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisText
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in Journal XX AI Analysis:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

