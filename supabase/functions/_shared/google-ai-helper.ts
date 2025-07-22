
/**
 * Calls the Google AI Gemini API with support for both simple text prompts and complex multi-modal content.
 * @param {string} apiKey - Your Google AI Studio API key.
 * @param {string} modelName - The name of the model to use (e.g., 'gemini-1.5-pro-latest').
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
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    };
  } else {
    // Multi-modal contents array (for images + text)
    payload = {
      contents: promptOrContents,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    };
  }

  console.log('Google AI API Request:', JSON.stringify(payload, null, 2));

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
  console.log('Google AI API Response:', JSON.stringify(data, null, 2));
  
  if (
    !data.candidates ||
    !data.candidates[0].content ||
    !data.candidates[0].content.parts ||
    !data.candidates[0].content.parts[0].text
  ) {
    console.error('Invalid response structure:', data);
    throw new Error("Invalid response structure from Google AI API.");
  }

  return data.candidates[0].content.parts[0].text;
}
