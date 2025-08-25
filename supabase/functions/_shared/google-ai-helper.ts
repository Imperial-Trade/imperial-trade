// Fallback reason enums for consistent logging/metrics
export type FallbackReason = "max_tokens" | "invalid_json" | "timeout" | "safety" | "empty_candidates" | "unknown";

export interface GoogleAIOptions {
  maxOutputTokens?: number;
  timeoutMs?: number;
  responseSchema?: object;
}

/**
 * Helper function to call Google AI Gemini API
 * Optimized for short responses with robust fallback handling
 */
export interface GoogleAIMeta {
  tokensOut: number | string;
  finishReason: string | null;
}

export async function callGoogleAI(
  apiKey: string,
  modelName: string,
  promptOrContents: string | any[],
  opts: GoogleAIOptions = {}
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  // Default options optimized for short responses
  const maxOutputTokens = opts.maxOutputTokens ?? 300;
  const timeoutMs = opts.timeoutMs ?? 12000;
  
  let requestBody: any;
  
  if (typeof promptOrContents === 'string') {
    // Text-only prompt
    requestBody = {
      contents: [{
        parts: [{ text: promptOrContents }]
      }],
      generationConfig: {
        maxOutputTokens,
        responseMimeType: "application/json",
        ...(opts.responseSchema && { responseSchema: opts.responseSchema })
      }
    };
  } else {
    // Multi-modal content (array of parts)
    requestBody = {
      contents: [{
        parts: promptOrContents
      }],
      generationConfig: {
        maxOutputTokens,
        responseMimeType: "application/json",
        ...(opts.responseSchema && { responseSchema: opts.responseSchema })
      }
    };
  }

  // Create a timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      return createTransportFallback('empty_candidates');
    }

    const candidate = data.candidates[0];
    if (!candidate) {
      console.error('First candidate is null/undefined:', data);
      return createTransportFallback('empty_candidates');
    }

    // Map finishReason to enum
    const finishReason = candidate.finishReason;
    console.log('AI response finishReason:', finishReason);

    if (finishReason === 'SAFETY') {
      console.error('Content blocked by safety filters:', candidate);
      return createTransportFallback('safety');
    }

    if (finishReason === 'MAX_TOKENS') {
      console.error('Response truncated due to token limit:', candidate);
      return createTransportFallback('max_tokens');
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('No content parts in candidate:', candidate);
      return createTransportFallback('empty_candidates');
    }

    // Join all text parts safely
    const textParts = candidate.content.parts
      .map(part => part.text)
      .filter(text => text && text.trim())
      .join(' ');

    if (!textParts) {
      console.error('No text in content parts:', candidate.content.parts);
      return createTransportFallback('empty_candidates');
    }

    let responseText = textParts.trim();
    
    // Strip markdown code fences if present
    responseText = responseText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    
    // Validate JSON if response mime type was set to JSON
    if (requestBody.generationConfig.responseMimeType === "application/json") {
      try {
        JSON.parse(responseText);
      } catch (parseError) {
        console.error(`Invalid JSON response from AI: ${responseText}`, parseError);
        return createTransportFallback('invalid_json');
      }
    }

    // Log successful completion with metrics
    console.log('AI call successful:', {
      finishReason,
      tokensOut: data.usageMetadata?.candidatesTokenCount || 'unknown',
      responseLength: responseText.length
    });
    
    return responseText;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Google AI API call failed:', error);
    
    // Return transport-only fallback
    if (error.name === 'AbortError') {
      return createTransportFallback('timeout');
    }
    
    return createTransportFallback('unknown');
  }
}

/**
 * Enhanced version that returns both text and metadata
 */
export async function callGoogleAIWithMeta(
  apiKey: string,
  modelName: string,
  promptOrContents: string | any[],
  opts: GoogleAIOptions = {}
): Promise<{ text: string; meta: GoogleAIMeta }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  // Default options optimized for short responses
  const maxOutputTokens = opts.maxOutputTokens ?? 300;
  const timeoutMs = opts.timeoutMs ?? 12000;
  
  let requestBody: any;
  
  if (typeof promptOrContents === 'string') {
    // Text-only prompt
    requestBody = {
      contents: [{
        parts: [{ text: promptOrContents }]
      }],
      generationConfig: {
        maxOutputTokens,
        responseMimeType: "application/json",
        ...(opts.responseSchema && { responseSchema: opts.responseSchema })
      }
    };
  } else {
    // Multi-modal content (array of parts)
    requestBody = {
      contents: [{
        parts: promptOrContents
      }],
      generationConfig: {
        maxOutputTokens,
        responseMimeType: "application/json",
        ...(opts.responseSchema && { responseSchema: opts.responseSchema })
      }
    };
  }

  // Create a timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
    
    // Extract metadata
    const tokensOut = data.usageMetadata?.candidatesTokenCount || 'unknown';
    let finishReason: string | null = null;
    
    // Safely extract response with proper fallbacks
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in response:', data);
      return {
        text: createTransportFallback('empty_candidates'),
        meta: { tokensOut, finishReason: 'empty_candidates' }
      };
    }

    const candidate = data.candidates[0];
    if (!candidate) {
      console.error('First candidate is null/undefined:', data);
      return {
        text: createTransportFallback('empty_candidates'),
        meta: { tokensOut, finishReason: 'empty_candidates' }
      };
    }

    // Map finishReason to enum
    finishReason = candidate.finishReason;
    console.log('AI response finishReason:', finishReason);

    if (finishReason === 'SAFETY') {
      console.error('Content blocked by safety filters:', candidate);
      return {
        text: createTransportFallback('safety'),
        meta: { tokensOut, finishReason }
      };
    }

    if (finishReason === 'MAX_TOKENS') {
      console.error('Response truncated due to token limit:', candidate);
      return {
        text: createTransportFallback('max_tokens'),
        meta: { tokensOut, finishReason }
      };
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('No content parts in candidate:', candidate);
      return {
        text: createTransportFallback('empty_candidates'),
        meta: { tokensOut, finishReason: finishReason || 'empty_candidates' }
      };
    }

    // Join all text parts safely
    const textParts = candidate.content.parts
      .map(part => part.text)
      .filter(text => text && text.trim())
      .join(' ');

    if (!textParts) {
      console.error('No text in content parts:', candidate.content.parts);
      return {
        text: createTransportFallback('empty_candidates'),
        meta: { tokensOut, finishReason: finishReason || 'empty_candidates' }
      };
    }

    let responseText = textParts.trim();
    
    // Strip markdown code fences if present
    responseText = responseText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    
    // Validate JSON if response mime type was set to JSON
    if (requestBody.generationConfig.responseMimeType === "application/json") {
      try {
        JSON.parse(responseText);
      } catch (parseError) {
        console.error(`Invalid JSON response from AI: ${responseText}`, parseError);
        return {
          text: createTransportFallback('invalid_json'),
          meta: { tokensOut, finishReason: finishReason || 'invalid_json' }
        };
      }
    }

    // Log successful completion with metrics
    console.log('AI call successful:', {
      finishReason,
      tokensOut,
      responseLength: responseText.length
    });
    
    return {
      text: responseText,
      meta: { tokensOut, finishReason }
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Google AI API call failed:', error);
    
    // Return transport-only fallback
    if (error.name === 'AbortError') {
      return {
        text: createTransportFallback('timeout'),
        meta: { tokensOut: 'unknown', finishReason: 'timeout' }
      };
    }
    
    return {
      text: createTransportFallback('unknown'),
      meta: { tokensOut: 'unknown', finishReason: 'unknown' }
    };
  }
}

// Returns only transport-level fallback (no content)
function createTransportFallback(reason: FallbackReason): string {
  return JSON.stringify({
    is_fallback: true,
    fallback_reason: reason
  });
}