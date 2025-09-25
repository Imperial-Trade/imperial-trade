
/**
 * Calls the Google AI Gemini API with support for both simple text prompts and complex multi-modal content.
 * @param {string} apiKey - Your Google AI Studio API key.
 * @param {string} modelName - The name of the model to use (e.g., 'gemini-2.5-pro').
 * @param {string | object} promptOrContents - Either a simple text prompt or a contents array for multi-modal requests.
 * @returns {Promise<string>} The text response from the AI model.
 */
export async function callGoogleAI(
  apiKey: string,
  modelName: string,
  promptOrContents: string | any[]
): Promise<string> {
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  let payload;

  // Handle both string prompts and contents arrays
  if (typeof promptOrContents === 'string') {
    // Simple text prompt
    payload = {
      contents: [
        {
          parts: [
            {
              text: promptOrContents,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3, // Reduced for more consistent JSON output
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192, // Increased from 2048 to 8192
        responseMimeType: "application/json", // Force JSON response
      },
    };
  } else {
    // Multi-modal contents array (for images + text)
    payload = {
      contents: promptOrContents,
      generationConfig: {
        temperature: 0.3, // Reduced for more consistent JSON output
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192, // Increased from 2048 to 8192
        responseMimeType: "application/json", // Force JSON response
      },
    };
  }

  console.log('Google AI API Request payload size:', JSON.stringify(payload).length);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Google AI API call failed:`, errorBody);
    throw new Error(`API request failed: ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  console.log('Google AI API Response structure:', JSON.stringify({
    candidates: data.candidates?.map((c: any) => ({
      finishReason: c.finishReason,
      hasContent: !!c.content,
      hasParts: !!c.content?.parts,
      partsCount: c.content?.parts?.length || 0
    })) || [],
    usageMetadata: data.usageMetadata || null
  }, null, 2));
  
  // Enhanced error handling for different response scenarios
  if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
    console.error('No candidates in response:', data);
    throw new Error("No candidates returned from Google AI API.");
  }

  const candidate = data.candidates[0];
  
  // Handle MAX_TOKENS finish reason
  if (candidate.finishReason === 'MAX_TOKENS') {
    console.error('MAX_TOKENS finish reason detected');
    throw new Error("Response truncated due to MAX_TOKENS limit. Please reduce input complexity.");
  }
  
  // Handle SAFETY finish reason
  if (candidate.finishReason === 'SAFETY') {
    console.error('SAFETY finish reason detected');
    throw new Error("Response blocked due to safety concerns.");
  }
  
  // Handle other problematic finish reasons
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    console.error('Unexpected finish reason:', candidate.finishReason);
    throw new Error(`API response finished with reason: ${candidate.finishReason}`);
  }

  // Validate response structure
  if (!candidate.content) {
    console.error('No content in candidate:', candidate);
    throw new Error("Invalid response structure: missing content.");
  }

  if (!candidate.content.parts || !Array.isArray(candidate.content.parts)) {
    console.error('No parts in content:', candidate.content);
    throw new Error("Invalid response structure: missing parts array.");
  }

  if (candidate.content.parts.length === 0) {
    console.error('Empty parts array:', candidate.content.parts);
    throw new Error("Invalid response structure: empty parts array.");
  }

  const firstPart = candidate.content.parts[0];
  if (!firstPart.text) {
    console.error('No text in first part:', firstPart);
    throw new Error("Invalid response structure: missing text in first part.");
  }

  const responseText = firstPart.text;
  
  // Validate that response is valid JSON when JSON is expected
  if (payload.generationConfig?.responseMimeType === "application/json") {
    try {
      JSON.parse(responseText);
    } catch (parseError) {
      console.error('Invalid JSON response:', responseText);
      throw new Error("AI returned invalid JSON response.");
    }
  }

  return responseText;
}
