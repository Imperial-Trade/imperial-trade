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

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google AI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Google AI API');
    }

    if (data.candidates[0].finishReason === 'SAFETY') {
      throw new Error('Content was blocked by safety filters');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    
    // Validate JSON if response mime type was set to JSON
    if (requestBody.generationConfig.responseMimeType === "application/json") {
      try {
        JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from AI: ${responseText}`);
      }
    }
    
    return responseText;
  } catch (error) {
    console.error('Google AI API call failed:', error);
    throw error;
  }
}