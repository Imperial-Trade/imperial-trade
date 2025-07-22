/**
 * Calls the Google AI Gemini API.
 * @param {string} apiKey - Your Google AI Studio API key.
 * @param {string} modelName - The name of the model to use (e.g., 'gemini-1.5-pro-latest').
 * @param {string} prompt - The complete prompt to send to the model.
 * @returns {Promise<string>} The text response from the AI model.
 */
export async function callGoogleAI(
  apiKey: string,
  modelName: string,
  prompt: string
): Promise<string> {
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: prompt,
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
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (
    !data.candidates ||
    !data.candidates[0].content ||
    !data.candidates[0].content.parts ||
    !data.candidates[0].content.parts[0].text
  ) {
    throw new Error("Invalid response structure from Google AI API.");
  }

  return data.candidates[0].content.parts[0].text;
}
