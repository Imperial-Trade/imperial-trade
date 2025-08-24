/**
 * Helper function to call Google AI Gemini API
 * Supports both text-only and multi-modal prompts
 */
export async function callGoogleAI(
  apiKey: string,
  modelName: string,
  promptOrContents: string | any[]
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  let requestBody: any;
  
  if (typeof promptOrContents === 'string') {
    // Text-only prompt
    requestBody = {
      contents: [{
        parts: [{ text: promptOrContents }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        responseMimeType: "application/json"
      }
    };
  } else {
    // Multi-modal content (array of parts)
    requestBody = {
      contents: [{
        parts: promptOrContents
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        responseMimeType: "application/json"
      }
    };
  }

  // Create a timeout controller for 20 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google AI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    // Safely extract response with proper fallbacks
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in response:', data);
      return createFallbackResponse('No AI response candidates available');
    }

    const candidate = data.candidates[0];
    if (!candidate) {
      console.error('First candidate is null/undefined:', data);
      return createFallbackResponse('AI response candidate is empty');
    }

    if (candidate.finishReason === 'SAFETY') {
      console.error('Content blocked by safety filters:', candidate);
      return createFallbackResponse('Content was blocked by safety filters');
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('No content parts in candidate:', candidate);
      return createFallbackResponse('AI response has no content');
    }

    const part = candidate.content.parts[0];
    if (!part || !part.text) {
      console.error('No text in first content part:', part);
      return createFallbackResponse('AI response text is empty');
    }

    let responseText = part.text.trim();
    
    // Strip markdown code fences if present
    responseText = responseText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    
    // Validate JSON if response mime type was set to JSON
    if (requestBody.generationConfig.responseMimeType === "application/json") {
      try {
        JSON.parse(responseText);
      } catch (parseError) {
        console.error(`Invalid JSON response from AI: ${responseText}`, parseError);
        return createFallbackResponse('AI returned invalid JSON format');
      }
    }
    
    return responseText;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Google AI API call failed:', error);
    
    // Return fallback instead of throwing
    if (error.name === 'AbortError') {
      return createFallbackResponse('AI request timed out');
    }
    
    return createFallbackResponse(`AI request failed: ${error.message}`);
  }
}

function createFallbackResponse(reason: string): string {
  return JSON.stringify({
    feedback: "Great job on this trade! Every trading experience is a learning opportunity that helps you grow as a trader. Keep analyzing your decisions and trust your process.",
    fallback_reason: reason
  });
}