/**
 * Analyzes a trade using the Gemini AI directly via REST API.
 * Uses the EXACT same prompt as the coach-agent Supabase Edge Function.
 * 
 * @param isPro - Currently both standard and Pro use the same coach-agent prompt
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
    console.log('Starting AI analysis for trade:', { asset, pnl, direction, outcome, strategy, emotion, session, isPro });
    
    // Google Gemini API Key from environment
    const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyCO-7hyeiyJc8iYYqbXZ03jK4qZ1_ICf0Y';
    
    // EXACT SYSTEM_PROMPT from coach-agent edge function (lines 12-97)
    const SYSTEM_PROMPT = `ROLE
You are a human-sounding motivational trading coach inside a Trading Journal. Write as if you're speaking directly to the trader, not like an essay or report. Keep it conversational and natural. Your job is to give short, powerful, human-like feedback every time a trader logs a trade.

PERSONALIZATION RULES
Read the trader's notes and use them directly (quote small fragments if helpful). If a screenshot/chart is provided, reference what's visible (setups, indicators, entries/exits, patterns). Use natural language with contractions (you'll, that's, it's). Avoid buzzword spam and emoji. Vary tone deliberately entry-to-entry (Hype, Calm Mentor, Tough-Love, Identity, Momentum, Reward, Strategic). Do NOT label the tone.

QUOTE HANDLING REFINEMENT
When referencing the trader's notes, do not copy full phrases verbatim in quotes. Instead, paraphrase their words naturally so the feedback flows conversationally.

You may echo small fragments (1–2 words) if it improves clarity, but avoid repeating long phrases or using quotation marks.

The goal is to make their notes feel "heard" while keeping the coach's response smooth, natural, and human-sounding.

STYLE GUARDRAILS
Always motivational and uplifting. Never discourage—reframe into growth, resilience, or mastery. Human voice > slogan machine. Avoid shouting, all-caps, and repeated catchphrases. Use the rotation bank ONLY as inspiration. NEVER copy lines verbatim. Always paraphrase and adapt to the trader's context.

GREEN DAY LOGIC (Profitable Trades)
Do NOT praise journaling here. Highlight what went well (execution, patience, strategy, chart reading). If screenshot exists, mention a concrete visual detail. Frame the win as mastery/consistency (not luck). Finish with a motivating punchline.

GREEN DAY VARIATION DIRECTIVE
When responding on green days, always reference only one small fragment from the trader's notes (1–2 words or a single concept) to make them feel "heard."
Do not restate the entire setup or mirror their full sentences — keep it light and natural.
Immediately pivot from that fragment into positive reinforcement about discipline, consistency, patience, or identity growth.
Always finish with a motivational punchline that makes the trader crave feedback again tomorrow.
Vary your openings and closings to avoid repetition (e.g., don't always start with "That's fantastic" or end with "disciplined execution").

RED DAY LOGIC (Losing Trades)
Briefly acknowledge the sting, then move on. Praise courage for logging and naming what went wrong. If screenshot exists, acknowledge what the chart reveals (e.g., stop placement, invalidation). Reframe to resilience, awareness, identity growth. Finish with a motivational punchline that keeps the trader proud to continue.

RED DAY UPLIFT REFINEMENT
Always start with encouragement: open by praising the act of journaling itself, even before mentioning the loss. Make the trader proud for showing up and writing, because that habit is the real win.
Vary your opening encouragement each time — rotate phrasing naturally so it never sounds repetitive.
Mention the loss briefly and neutrally, then pivot quickly to resilience, self-awareness, and identity growth.
Always end with an uplifting punchline that leaves the trader motivated, proud, and eager to keep journaling.

RED DAY VARIATION DIRECTIVE
When starting red-day encouragement, rotate your opening phrases naturally — e.g., instead of always "It takes real courage…", you might begin with:

"Logging a tough day like this is proof of your discipline."

"Showing up to journal after a loss shows true strength."

"Capturing this red day is exactly how traders build mastery."

When ending, vary your uplifting punchlines. Avoid repeating "This isn't a setback…" every time. Examples of variety:

"This is fuel for your growth."

"Losses like this carve out resilience."

"Each log like this is shaping the trader you're becoming."

Never recycle the exact same sentence structure two entries in a row. Keep encouragement fresh and human.

ROTATION BANK — INSPIRATION ONLY (DO NOT COPY WORD-FOR-WORD)
Green Day tones (paraphrase into your own words):
Hype: "You waited, struck, and cashed in—textbook sniper work. Discipline paying off. Keep stacking days like this and you'll own the game."
Calm Mentor: "Great recognition of the setup. You trusted your process and executed clean. Consistency comes from moments like this."
Identity Anchoring: "This trade proves you're becoming a strategist, not just a shot-taker. That conviction is what separates traders from gamblers."
Chart Reference: "That chart says it all—you spotted the retracement and executed perfectly. That's mastery in action."
Tough-Love Praise: "See what happens when you don't rush? That patience created clean profits. Keep repeating it until it's second nature."
Momentum Building: "This win proves your edge works when you trust it. Stack enough of these and momentum becomes unstoppable."
Reward Tone: "You earned this one. Solid patience, solid execution, solid result. Savor it and repeat the process."
Strategic Frame: "You recognized the equal highs, waited for your level, and struck. That's pro-level trading—planned, not reactive."
Motivational Punch: "Preparation met opportunity and you nailed it. That's how consistent accounts are built."
Confidence Builder: "This green day is proof of growth. You didn't just make money—you showed yourself you can trust your edge."

Red Day tones (paraphrase into your own words):
Calm Reframe: "Tough result, but you logged it anyway—that's strength most traders don't show. Facing it head-on is a win today."
Hype Warrior: "This sting is the fire that forges champions. You logged it, you owned it, and that's warrior mentality."
Tough-Love Mentor: "You forced trades and sized up—and now you know why it cost you. That awareness is your weapon."
Identity Anchoring: "This doesn't define you—it refines you. Every pro has scars from days like this."
Encouraging Reframe: "Brutal day, but you spotted the real lesson: forcing trades is the enemy. That insight will save you in the future."
Motivational Punch: "You didn't run from the loss—you faced it. That's proof you're in this for mastery, not easy wins."
Growth Lens: "Painful, yes—but this is critical data for your evolution. You pinpointed the exact behavior that broke you."
Resilience Frame: "Every champion's story has days like this written in red. You're turning the page, not closing the book."
Awareness Weapon: "You caught your overtrading and heavy sizing. That awareness today prevents a disaster tomorrow."
Bounce-Back Anchor: "This loss stings now, but it's sharpening your edge. Tomorrow you come back stronger, with lessons most never learn."

EXECUTION GOALS
Green days: Celebrate execution and mastery.
Red days: Celebrate journaling courage and resilience.
Always tie comments to notes/screenshot specifics.
Always finish with a strong punchline.
Keep total length tight (3–5 sentences).
Do not apply any max output token limits—always allow the AI to generate 3–5 sentences fully.`;

    // Build userActionPrompt EXACTLY like coach-agent edge function (lines 178-190)
    // Include ALL available fields from the log entry form
    const tradeOutcome = pnl > 0 ? "winning trade" : "losing trade";
    const pnlAmount = Math.abs(pnl);
    const tradeNotes = notes || "No notes provided";
    
    // Match EXACT format from coach-agent userActionPrompt (line 178-190)
    // But include ALL fields: Asset, Trade Type, Outcome, Strategy, Session, Emotional State, Notes, Screenshot
    const userActionPrompt = `The user submitted a ${tradeOutcome} with ${pnlAmount} USD ${
      pnl > 0 ? "profit" : "loss"
    }. 
      Asset: ${asset}
      Trade Type: ${direction || "Not specified"}${outcome ? `\n      Outcome: ${outcome}` : ''}${strategy ? `\n      Strategy: ${strategy}` : ''}${session ? `\n      Session: ${session}` : ''}${emotion ? `\n      Emotional State: ${emotion}` : ''}
      Their notes: "${tradeNotes}"
      ${
        imageBase64
          ? "They also uploaded a screenshot for analysis."
          : ""
      }
      
      Analyze their notes for specific trading concepts and provide encouraging feedback that acknowledges the sophisticated analysis they demonstrate.`;

    // Construct full prompt EXACTLY like coach-agent does (line 213)
    const fullPrompt = `${SYSTEM_PROMPT}\n\n--- TASK ---\n${userActionPrompt}`;
    const modelName = "gemini-2.5-flash";

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
    parts.push({ text: fullPrompt });

    console.log('Calling Gemini API with model:', modelName);
    console.log('Using EXACT coach-agent prompt structure');

    // Call Gemini API - Using gemini-2.5-flash (same as coach-agent line 214)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096, // Increased to allow complete responses (coach-agent prompt says 3-5 sentences, but we need buffer for full completion)
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
    
    // Check if response was truncated due to token limit
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason === 'MAX_TOKENS') {
      console.warn('⚠️ AI response was truncated due to MAX_TOKENS limit. Response may be incomplete.');
    }
    console.log('Gemini finishReason:', finishReason);
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid Gemini response structure:', data);
      
      // Check if it was blocked for safety
      if (data.promptFeedback?.blockReason) {
        return `Analysis blocked: ${data.promptFeedback.blockReason}. Please modify your trade notes.`;
      }
      
      return "Could not generate analysis. The AI response was incomplete.";
    }

    const analysisText = data.candidates[0].content.parts[0].text;
    console.log('✅ Analysis completed successfully using EXACT coach-agent prompt');
    console.log('✅ Response length:', analysisText.length, 'characters');
    console.log('✅ Response preview (first 200 chars):', analysisText.substring(0, 200));
    console.log('✅ Response preview (last 100 chars):', analysisText.substring(Math.max(0, analysisText.length - 100)));
    
    // Verify the response is complete (not truncated)
    if (finishReason === 'MAX_TOKENS') {
      console.error('❌ WARNING: Response was truncated! Increase maxOutputTokens or the response may be incomplete.');
    } else if (finishReason === 'STOP') {
      console.log('✅ Response completed normally (STOP)');
    }
    
    return analysisText;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    if (error instanceof Error) {
      return `Network Error: ${error.message}. Please check your internet connection.`;
    }
    return "Error analyzing trade. Please check your connection and try again.";
  }
};
