/**
 * Extracts trade details from screenshot using Google Gemini Vision API
 */
export interface ExtractedTradeDetails {
  exit_price: number | null;
  entry_price: number | null;
  position_size: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  actual_outcome: 'win' | 'loss' | null;
  confidence: 'high' | 'medium' | 'low';
}

export const extractTradeDetailsFromImage = async (
  imageBase64: string
): Promise<ExtractedTradeDetails> => {
  try {
    const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyCO-7hyeiyJc8iYYqbXZ03jK4qZ1_ICf0Y';
    
    const EXTRACTION_PROMPT = `You are analyzing a trading screenshot. Extract ONLY the visible trade details. Return a JSON object with these fields:
{
  "exit_price": number or null (actual exit/close price if visible),
  "entry_price": number or null (entry/open price if visible),
  "position_size": number or null (lot size, contract size, or position size if visible),
  "stop_loss": number or null (PLANNED stop loss price if visible - this is critical for risk management analysis),
  "take_profit": number or null (PLANNED take profit/target price if visible - this is critical for execution analysis),
  "actual_outcome": "win" | "loss" | null (based on visible P&L),
  "confidence": "high" | "medium" | "low" (based on data visibility)
}

IMPORTANT:
- Only extract numbers that are clearly visible in the screenshot
- Return null if a value is not visible or unclear
- For actual_outcome, determine from visible P&L (positive = win, negative = loss)
- CRITICAL: take_profit and stop_loss are the PLANNED values from the trade setup (not actual exit prices)
- These planned values are essential for analyzing trade execution and discipline
- Be conservative with confidence - only "high" if multiple values are clearly visible
- Return ONLY valid JSON, no explanations`;

    const base64Data = imageBase64.includes('base64,') 
      ? imageBase64.split('base64,')[1] 
      : imageBase64;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64Data
                }
              },
              { text: EXTRACTION_PROMPT }
            ]
          }],
          generationConfig: {
            temperature: 0.1, // Low temperature for accurate extraction
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 500,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      console.error('Image extraction API error:', response.status);
      return {
        exit_price: null,
        entry_price: null,
        position_size: null,
        stop_loss: null,
        take_profit: null,
        actual_outcome: null,
        confidence: 'low'
      };
    }

    const data = await response.json();
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!extractedText) {
      return {
        exit_price: null,
        entry_price: null,
        position_size: null,
        stop_loss: null,
        take_profit: null,
        actual_outcome: null,
        confidence: 'low'
      };
    }

    // Parse JSON response
    try {
      const extracted = JSON.parse(extractedText);
      
      return {
        exit_price: extracted.exit_price ? Number(extracted.exit_price) : null,
        entry_price: extracted.entry_price ? Number(extracted.entry_price) : null,
        position_size: extracted.position_size ? Number(extracted.position_size) : null,
        stop_loss: extracted.stop_loss ? Number(extracted.stop_loss) : null,
        take_profit: extracted.take_profit ? Number(extracted.take_profit) : null,
        actual_outcome: extracted.actual_outcome || null,
        confidence: extracted.confidence || 'low'
      };
    } catch (parseError) {
      console.error('Failed to parse extracted JSON:', parseError);
      return {
        exit_price: null,
        entry_price: null,
        position_size: null,
        stop_loss: null,
        take_profit: null,
        actual_outcome: null,
        confidence: 'low'
      };
    }

  } catch (error) {
    console.error('Image extraction error:', error);
    return {
      exit_price: null,
      entry_price: null,
      position_size: null,
      stop_loss: null,
      take_profit: null,
      actual_outcome: null,
      confidence: 'low'
    };
  }
};

