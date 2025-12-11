/**
 * Analyzes a trade using the Gemini AI directly via REST API.
 * Using the Google API key for Journal XX AI analysis.
 * 
 * @param isPro - If true, provides advanced PRO-level analysis with more depth
 */
export const analyzeTradeWithGemini = async (
  asset: string,
  pnl: number,
  notes: string,
  imageBase64?: string,
  // Pro Fields
  direction?: string,
  outcome?: string,
  strategy?: string,
  emotion?: string,
  session?: string,
  isPro: boolean = false
): Promise<string> => {
  try {
    console.log('Starting AI analysis for trade:', { asset, pnl, direction, outcome, strategy, isPro });
    
    // Google Gemini API Key
    const API_KEY = 'AIzaSyCO-7hyeiyJc8iYYqbXZ03jK4qZ1_ICf0Y';
    
    // Different prompts for Standard vs PRO version
    const promptText = isPro ? `
You are an ELITE institutional trading mentor with 20+ years experience at top hedge funds.
Analyze this trade with ADVANCED depth and provide comprehensive institutional-grade feedback.

**Trade Data:**
- Asset: ${asset}
- PnL: ${pnl > 0 ? '+' : ''}${pnl}
- Direction: ${direction || 'N/A'}
- Outcome: ${outcome || 'N/A'}
- Strategy: ${strategy || 'N/A'}
- Session: ${session || 'N/A'}
- Emotional State: ${emotion || 'N/A'}

**Trader's Notes:** 
"${notes}"

**PRO Analysis Tasks:**
If an image is provided, perform detailed chart analysis including key levels, market structure, and entry/exit quality.

Provide comprehensive PRO-level insights:
1. **Setup Quality Score (1-10):** Deep evaluation of the ${strategy || 'trading'} setup quality, entry timing, and risk-reward.
2. **Market Structure Analysis:** Assess the broader context - trend, key levels, and if the trade aligned with institutional flow.
3. **Psychology Deep Dive:** Analyze how "${emotion || 'emotional state'}" affected decision-making. Identify cognitive biases present.
4. **Risk Management Review:** Evaluate position sizing, stop placement, and overall risk approach.
5. **Performance Pattern Recognition:** Connect this trade to recurring patterns in trading behavior.
6. **Actionable Improvement Plan:** Specific, measurable steps to improve this type of setup.

**PRO Constraints:**
- Provide institutional-grade analysis with specific technical details
- Reference advanced concepts (order flow, liquidity, market microstructure) when relevant
- Be direct and data-driven in feedback
- Maximum 8-10 sentences with dense, actionable insights
    `.trim() : `
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
    `.trim();

    // Build request parts
    const parts: any[] = [];

    // Add image if available
    if (imageBase64) {
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

    console.log('Calling Gemini API with model: gemini-2.0-flash');

    // Call Gemini API - Using gemini-2.0-flash (latest model)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
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
              text: isPro 
                ? "You are an elite hedge fund trading mentor with expertise in market microstructure, order flow, and behavioral psychology. You provide advanced, institutional-grade analysis with specific actionable insights. You identify patterns in trader behavior and provide data-driven feedback."
                : "You are an elite, institutional-grade trading mentor. You value process over pnl."
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

    console.log('Gemini API Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(errorText);
        return `AI Error: ${errorData.error?.message || 'API request failed'}. Please contact support.`;
      } catch {
        return `Error analyzing trade (Status ${response.status}). Please try again later.`;
      }
    }

    const data = await response.json();
    console.log('Gemini API Response Data:', data);
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid Gemini response structure:', data);
      
      // Check if it was blocked for safety
      if (data.promptFeedback?.blockReason) {
        return `Analysis blocked: ${data.promptFeedback.blockReason}. Please modify your trade notes.`;
      }
      
      return "Could not generate analysis. The AI response was incomplete.";
    }

    const analysisText = data.candidates[0].content.parts[0].text;
    console.log('Analysis completed successfully');
    return analysisText;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    if (error instanceof Error) {
      return `Network Error: ${error.message}. Please check your internet connection.`;
    }
    return "Error analyzing trade. Please check your connection and try again.";
  }
};
