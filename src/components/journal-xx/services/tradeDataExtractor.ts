/**
 * Extracts structured trading data from screenshots using Gemini AI
 * This is a FALLBACK for when the edge function fails - prefer using the edge function
 */

export interface ExtractedTradeDetails {
  entry_price: number | null;
  exit_price: number | null;
  position_size: number | null;
  planned_target_price: number | null;
  planned_stop_loss: number | null;
  target_hit_by_market: boolean | null;
  trade_direction: 'Long' | 'Short' | null;
  confidence: 'low' | 'medium' | 'high';
}

const SYSTEM_PROMPT = `You are a highly specialized AI designed to extract precise trading data from screenshots of ANY trading platform. Your output MUST be a valid JSON object.

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

/**
 * Extracts structured trading data from a screenshot using Gemini AI
 * This is a FALLBACK function - the primary extraction happens via edge function
 * 
 * @param imageBase64 - Base64 encoded image or data URL
 * @param asset - Asset ticker (e.g., "XAUUSD")
 * @param direction - Trade direction ("Long" or "Short")
 * @param pnl - Profit and loss value
 * @returns Promise resolving to extracted trade details
 */
export async function extractTradeDataFromScreenshot(
  imageBase64: string,
  asset: string,
  direction: 'Long' | 'Short',
  pnl: number
): Promise<ExtractedTradeDetails> {
  try {
    // Use same API key as geminiService for consistency
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ [TRADER DNA] Gemini API key not found in environment variables');
      console.error('❌ [TRADER DNA] Check VITE_GOOGLE_API_KEY in .env file');
      console.error('❌ [TRADER DNA] Data extraction failed - Trader DNA Execution & Risk Management will be inaccurate');
      return {
        entry_price: null,
        exit_price: null,
        position_size: null,
        planned_target_price: null,
        planned_stop_loss: null,
        target_hit_by_market: null,
        trade_direction: null,
        confidence: 'low',
      };
    }

    console.log('✅ [TRADER DNA FALLBACK] API key found, starting Gemini data extraction...');

    // Prepare image part for Gemini
    let imagePart: { inlineData: { data: string; mimeType: string } };
    if (imageBase64.startsWith('data:')) {
      // Data URL - extract base64 part
      const base64Data = imageBase64.split(',')[1];
      if (!base64Data || base64Data.length === 0) {
        console.error('❌ Invalid base64 data in data URL');
        throw new Error('Invalid image data');
      }
      
      // Check base64 size (Gemini has limits - typically 20MB, but base64 is ~33% larger)
      // Limit to ~15MB base64 (roughly 10MB image)
      if (base64Data.length > 15 * 1024 * 1024) {
        console.error('❌ Image too large for Gemini API');
        throw new Error('Image too large. Please use a smaller image (max ~10MB).');
      }
      
      const mimeType = imageBase64.split(',')[0].split(':')[1].split(';')[0];
      // Validate mime type
      if (!mimeType || !mimeType.startsWith('image/')) {
        console.error('❌ Invalid image mime type:', mimeType);
        throw new Error('Invalid image format');
      }
      
      imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType || 'image/png',
        },
      };
    } else {
      // Assume it's already base64
      if (!imageBase64 || imageBase64.length === 0) {
        console.error('❌ Empty base64 string');
        throw new Error('Invalid image data');
      }
      
      // Check size
      if (imageBase64.length > 15 * 1024 * 1024) {
        console.error('❌ Image too large for Gemini API');
        throw new Error('Image too large. Please use a smaller image (max ~10MB).');
      }
      
      imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/png',
        },
      };
    }

    const userPrompt = `Extract trading data from this ${asset} ${direction} trade screenshot. PnL: ${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SYSTEM_PROMPT },
                { text: userPrompt },
                imagePart,
              ],
            },
          ],
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
      console.error('❌ Gemini API error:', errorText);
      
      // Parse error response for better error messages
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          throw new Error(`Gemini API error: ${errorData.error.message}`);
        }
      } catch {
        // If parsing fails, use the raw error
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.warn('⚠️ No text response from Gemini');
      return {
        entry_price: null,
        exit_price: null,
        position_size: null,
        planned_target_price: null,
        planned_stop_loss: null,
        target_hit_by_market: null,
        trade_direction: null,
        confidence: 'low',
      };
    }

    console.log('📊 [TRADER DNA FALLBACK] Raw Gemini response:', text);

    // Parse JSON response
    let extracted: ExtractedTradeDetails;
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleanedText);
      console.log('✅ [TRADER DNA FALLBACK] Parsed extraction result:', extracted);
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response:', parseError);
      console.error('Raw response:', text);
      return {
        entry_price: null,
        exit_price: null,
        position_size: null,
        planned_target_price: null,
        planned_stop_loss: null,
        target_hit_by_market: null,
        trade_direction: null,
        confidence: 'low',
      };
    }

    // Validate and return
    return {
      entry_price: extracted.entry_price ?? null,
      exit_price: extracted.exit_price ?? null,
      position_size: extracted.position_size ?? null,
      planned_target_price: extracted.planned_target_price ?? null,
      planned_stop_loss: extracted.planned_stop_loss ?? null,
      target_hit_by_market: extracted.target_hit_by_market ?? null,
      trade_direction: extracted.trade_direction ?? null,
      confidence: extracted.confidence || 'low',
    };
  } catch (error) {
    console.error('❌ Error extracting trade data from screenshot:', error);
    return {
      entry_price: null,
      exit_price: null,
      position_size: null,
      planned_target_price: null,
      planned_stop_loss: null,
      target_hit_by_market: null,
      trade_direction: null,
      confidence: 'low',
    };
  }
}
