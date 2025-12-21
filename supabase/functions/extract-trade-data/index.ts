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

const EXTRACTION_PROMPT = `You are a highly specialized AI designed to extract precise trading data from screenshots of ANY trading platform. Your output MUST be a valid JSON object.

**CRITICAL: TRADINGVIEW COLORED BOX RECOGNITION**

TradingView uses colored rectangular overlay boxes to display trade information. These are THE PRIMARY DATA SOURCE:

**1. GREEN BOX = TARGET/TAKE PROFIT ZONE:**
- Appears as a GREEN/TEAL colored rectangular shaded area on the chart
- Contains text like: "Target: [number] ([percentage]%) [pips], Amount: [value]"
- Example: "Target: 7.359 (0.170%) 735.9, Amount: 12845.71"
- The TOP EDGE of the green box (for Long trades) = planned_target_price
- Read the EXACT PRICE from the right-side price scale where the green box top edge aligns
- The "Amount" value in the green box may indicate position value (not always position size)

**2. RED BOX = STOP LOSS ZONE:**
- Appears as a RED colored rectangular shaded area on the chart
- Contains text like: "Stop: [number] ([percentage]%) [pips], Amount: [value]"
- Example: "Stop: 2.586 (0.060%) 258.6, Amount: 9000"
- The BOTTOM EDGE of the red box (for Long trades) = planned_stop_loss
- Read the EXACT PRICE from the right-side price scale where the red box bottom edge aligns

**3. CLOSED P&L INFO BOX (White/Light colored box):**
- Shows actual trade results
- Contains: "Closed P&L: [number], Qty: [number]" and optionally "Risk/Reward Ratio: [number]"
- Example: "Closed P&L: 7.359, Qty: 386, Risk/Reward Ratio: 2.85"
- **CRITICAL: "Qty: [number]" = position_size** (e.g., "Qty: 386" means position_size = 386)
- The vertical position of this box on the chart = exit_price (read from right-side price scale)

**4. ENTRY PRICE:**
- For Long trades: The BOTTOM of the trade overlay area where green/red boxes start
- Often marked by blue/green upward arrows labeled "MacdLE", "Buy", or similar
- Read the EXACT PRICE from the right-side price scale at the entry marker/box start

**5. EXIT PRICE:**
- Where the "Closed P&L" info box is positioned vertically
- For profitable Long trades: Near the TOP of the green target box
- Read the EXACT PRICE from the right-side price scale at the exit point

**PRICE SCALE READING (RIGHT SIDE OF CHART):**
- TradingView shows a vertical price scale on the right side
- Prices displayed as: 4,345.000, 4,340.000, 4,335.000, etc.
- To find any price: trace horizontally from the point of interest to the price scale
- Use EXACT numbers from the scale, not estimates

**OTHER TRADING PLATFORMS:**

**MetaTrader (MT4/MT5):**
- Entry/exit in "Trade" tab or "Account History"
- Position size as "Volume" (lots) - e.g., "0.10 lot" = 0.10
- TP/SL as horizontal lines on chart or in order details
- "Buy" = Long, "Sell" = Short

**Binance/Crypto Exchanges:**
- Entry/exit in order history
- Position size as "Amount" or "Quantity"
- TP/SL may show as orders or lines

**Generic Platforms:**
- Look for: "Entry", "Exit", "Open", "Close", "Size", "Volume", "TP", "SL", "Target", "Stop"

**OUTPUT REQUIREMENTS:**
1. **STRICTLY JSON** - No markdown, no explanations, ONLY valid JSON
2. **EXTRACT FROM VISUAL** - Only extract what you can SEE in the image
3. **USE PRICE SCALE** - Always read exact prices from the right-side scale
4. **PRIORITIZE "Qty"** - For position_size, "Qty: 386" → position_size = 386
5. **NULL IF NOT VISIBLE** - Return null for fields you cannot clearly identify
6. **CONFIDENCE:**
   - 'high': 4+ fields extracted clearly (especially if colored boxes visible)
   - 'medium': 2-3 fields extracted
   - 'low': Very little data visible

**JSON SCHEMA:**
{
  "entry_price": number | null,
  "exit_price": number | null,
  "position_size": number | null,
  "planned_target_price": number | null,
  "planned_stop_loss": number | null,
  "target_hit_by_market": boolean | null,
  "trade_direction": "Long" | "Short" | null,
  "confidence": "low" | "medium" | "high"
}

**EXAMPLE - TradingView with colored boxes:**
If you see:
- Green box with "Target: 7.359", top edge at 4,345.000 on price scale
- Red box with "Stop: 2.586", bottom edge at 4,335.000 on price scale
- Info box showing "Closed P&L: 7.359, Qty: 386" at price level 4,344.964
- Entry arrow at price level 4,337.605

Output:
{
  "entry_price": 4337.605,
  "exit_price": 4344.964,
  "position_size": 386,
  "planned_target_price": 4345.000,
  "planned_stop_loss": 4335.000,
  "target_hit_by_market": true,
  "trade_direction": "Long",
  "confidence": "high"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GOOGLE_API_KEY) {
      console.error('❌ [EXTRACT] GOOGLE_API_KEY is not set');
      throw new Error('GOOGLE_API_KEY is not set');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ [EXTRACT] Supabase configuration is missing');
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { trade_id, image_url, asset, direction, pnl } = await req.json();

    if (!trade_id || !image_url) {
      console.error('❌ [EXTRACT] Missing trade_id or image_url');
      return new Response(JSON.stringify({ error: "Missing trade_id or image_url" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('🔍 [EXTRACT] Starting data extraction for trade:', trade_id);
    console.log('🔍 [EXTRACT] Image URL:', image_url.substring(0, 100) + '...');
    console.log('🔍 [EXTRACT] Asset:', asset, 'Direction:', direction, 'PnL:', pnl);

    // Convert image URL to base64
    let imageBase64: string;
    try {
      imageBase64 = await imageUrlToBase64(image_url);
      console.log('✅ [EXTRACT] Image converted to base64, size:', imageBase64.length);
    } catch (error) {
      console.error('❌ [EXTRACT] Failed to fetch image:', error);
      
      // Update trade to mark extraction as failed
      await supabase
        .from('trade_journal_entries')
        .update({ processing_status: 'failed' })
        .eq('id', trade_id);
      
      return new Response(JSON.stringify({ 
        error: "Failed to fetch image",
        extracted: null 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Call Gemini API for extraction
    const userPrompt = `Extract trading data from this ${asset || 'unknown'} ${direction || 'unknown'} trade screenshot. PnL: ${pnl !== undefined ? (pnl >= 0 ? '+' : '') + '$' + Math.abs(pnl).toFixed(2) : 'unknown'}

**CRITICAL EXTRACTION STEPS FOR TRADINGVIEW:**

1. **FIND THE "Qty" VALUE** - Look for text like "Qty: 386" in the Closed P&L info box
   → This is your position_size (e.g., Qty: 386 means position_size = 386)

2. **FIND THE GREEN BOX (Target zone)**
   → Read the price from the RIGHT SIDE price scale where the TOP edge of the green box aligns
   → This is your planned_target_price

3. **FIND THE RED BOX (Stop loss zone)**
   → Read the price from the RIGHT SIDE price scale where the BOTTOM edge of the red box aligns
   → This is your planned_stop_loss

4. **FIND ENTRY POINT**
   → Look for entry arrows (MacdLE, Buy, etc.) or where the trade overlay starts
   → Read the price from the RIGHT SIDE price scale
   → This is your entry_price

5. **FIND EXIT POINT**
   → Look at where the "Closed P&L" box is positioned vertically
   → Read the price from the RIGHT SIDE price scale
   → This is your exit_price

6. **DETERMINE IF TARGET WAS HIT**
   → If Closed P&L shows positive profit AND exit_price is near/above planned_target_price
   → target_hit_by_market = true

**IMPORTANT:**
- Read EXACT prices from the price scale (right side): e.g., 4,344.964, 4,337.605, 4,335.019
- "Qty" is ALWAYS position_size in TradingView
- Green box = Target, Red box = Stop Loss
- If you can see colored boxes clearly, confidence should be 'high'

Return ONLY valid JSON with the extracted values.`;

    console.log('📡 [EXTRACT] Calling Gemini API...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: EXTRACTION_PROMPT },
              { text: userPrompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64,
                },
              },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [EXTRACT] Gemini API error:', errorText);
      
      await supabase
        .from('trade_journal_entries')
        .update({ processing_status: 'failed' })
        .eq('id', trade_id);
      
      return new Response(JSON.stringify({ 
        error: `Gemini API error: ${response.status}`,
        extracted: null 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.warn('⚠️ [EXTRACT] No text response from Gemini');
      
      await supabase
        .from('trade_journal_entries')
        .update({ processing_status: 'complete' })
        .eq('id', trade_id);
      
      return new Response(JSON.stringify({ 
        error: "No response from AI",
        extracted: null 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('📊 [EXTRACT] Raw Gemini response:', text);

    // Parse JSON response
    let extracted: {
      entry_price?: number | null;
      exit_price?: number | null;
      position_size?: number | null;
      planned_target_price?: number | null;
      planned_stop_loss?: number | null;
      target_hit_by_market?: boolean | null;
      trade_direction?: string | null;
      confidence?: string;
    };
    
    try {
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleanedText);
      console.log('✅ [EXTRACT] Parsed extraction:', extracted);
    } catch (parseError) {
      console.error('❌ [EXTRACT] Failed to parse response:', parseError);
      
      await supabase
        .from('trade_journal_entries')
        .update({ processing_status: 'complete' })
        .eq('id', trade_id);
      
      return new Response(JSON.stringify({ 
        error: "Failed to parse AI response",
        extracted: null 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Only update if confidence is medium or high
    if (extracted.confidence === 'medium' || extracted.confidence === 'high') {
      const updateData: Record<string, unknown> = { processing_status: 'complete' };
      const fieldsUpdated: string[] = [];
      
      if (extracted.entry_price != null) {
        updateData.entry_price = extracted.entry_price;
        fieldsUpdated.push('entry_price');
      }
      if (extracted.exit_price != null) {
        updateData.exit_price = extracted.exit_price;
        fieldsUpdated.push('exit_price');
      }
      if (extracted.position_size != null) {
        updateData.position_size = extracted.position_size;
        fieldsUpdated.push('position_size');
      }
      if (extracted.planned_target_price != null) {
        updateData.planned_target_price = extracted.planned_target_price;
        fieldsUpdated.push('planned_target_price');
      }
      if (extracted.planned_stop_loss != null) {
        updateData.planned_stop_loss = extracted.planned_stop_loss;
        fieldsUpdated.push('planned_stop_loss');
      }
      if (extracted.target_hit_by_market != null) {
        updateData.target_hit_by_market = extracted.target_hit_by_market;
        fieldsUpdated.push('target_hit_by_market');
      }

      console.log('💾 [EXTRACT] Updating trade with fields:', fieldsUpdated);
      console.log('💾 [EXTRACT] Update data:', updateData);

      const { error: updateError } = await supabase
        .from('trade_journal_entries')
        .update(updateData)
        .eq('id', trade_id);

      if (updateError) {
        console.error('❌ [EXTRACT] Database update failed:', updateError);
      } else {
        console.log('✅ [EXTRACT] Trade updated successfully with', fieldsUpdated.length, 'fields');
        console.log('✅ [EXTRACT] Trader DNA Execution & Risk Management will now be accurate');
      }
    } else {
      console.warn('⚠️ [EXTRACT] Low confidence (' + extracted.confidence + '), skipping field updates');
      
      await supabase
        .from('trade_journal_entries')
        .update({ processing_status: 'complete' })
        .eq('id', trade_id);
    }

    return new Response(JSON.stringify({ 
      success: true,
      extracted,
      updated: extracted.confidence !== 'low',
      fields_updated: extracted.confidence !== 'low' ? Object.keys(extracted).filter(k => k !== 'confidence' && extracted[k as keyof typeof extracted] != null) : []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ [EXTRACT] Error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Unknown error',
      extracted: null 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

