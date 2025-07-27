import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAI } from "../_shared/google-ai-helper.ts";
import { sanitizeText } from "../_shared/sanitizer.ts";

interface DeconstructorRequest {
  user_id: string;
  file_urls?: string[];
}

// Fixed helper function to convert image URL to base64 (handles large images)
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    console.log("Converting image to base64:", url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64String = btoa(binary);
    console.log(
      "Image converted to base64 successfully, size:",
      base64String.length
    );
    return base64String;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
}

// Helper function to detect MIME type from URL
function getMimeTypeFromUrl(url: string): string {
  const extension = url.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg"; // Default fallback
  }
}

// Master Prompt - The Brain of MECCA: Screenshot-Focused Trading Analysis
const SYSTEM_PROMPT = `You are MECCA (Master Elite Cognitive Coach & Analyzer), an AI specialized in VISUAL ANALYSIS of trading screenshots. Your primary function is to extract precise data and insights directly from trading platform images.

**CRITICAL MISSION: SCREENSHOT-FIRST ANALYSIS**
You MUST base your analysis primarily on what you can SEE in the provided screenshots. Ignore theoretical assumptions - focus on visible evidence only.

**VISUAL DATA EXTRACTION PROTOCOL:**

1. **IMMEDIATE SCREENSHOT SCAN:**
   - Read ALL visible numbers: account balance, equity, P&L, margin levels
   - Count exact wins/losses from trading history if visible
   - Extract position sizes, lot sizes, and leverage from visible trades
   - Identify trading platform (MT4, MT5, TradingView, cTrader, etc.)
   - Note time zones and trading sessions visible

2. **TRADING PERFORMANCE METRICS (From Screenshots):**
   - Calculate win rate from visible trade counts
   - Extract profit factor if gross profit/loss visible
   - Identify maximum drawdown from equity curves
   - Note consecutive wins/losses patterns
   - Analyze risk-reward ratios from individual trades

3. **CHART PATTERN RECOGNITION:**
   - Identify support/resistance levels and price action
   - Recognize chart patterns (triangles, flags, head & shoulders)
   - Assess entry/exit timing quality relative to price movements
   - Note technical indicators visible on charts
   - Evaluate trend following vs counter-trend approaches

4. **BEHAVIORAL PATTERN DETECTION:**
   - Spot revenge trading (increasing position size after losses)
   - Identify FOMO entries (chasing price, poor timing)
   - Assess position sizing consistency across trades
   - Note emotional trading patterns from execution timing

**RESPONSE FORMAT - SCREENSHOT-BASED JSON:**
{
  "screenshot_analysis": {
    "images_processed": number,
    "platform_detected": "specific trading platform name",
    "data_quality": "excellent|good|fair|poor",
    "visible_timeframe": "timeframe if identifiable",
    "account_type": "demo|live|prop|unknown"
  },
  "extracted_metrics": {
    "account_balance": "exact number from screenshot or 'not visible'",
    "equity": "exact number from screenshot or 'not visible'",
    "total_pnl": "exact P&L figure or 'not visible'",
    "win_count": "number of winning trades visible",
    "loss_count": "number of losing trades visible",
    "win_rate": "calculated percentage or 'cannot calculate'",
    "largest_win": "biggest profit visible",
    "largest_loss": "biggest loss visible",
    "position_sizes": "range of lot sizes observed"
  },
  "visual_patterns": {
    "chart_patterns_seen": ["list specific patterns visible in charts"],
    "support_resistance": ["key levels visible in screenshots"],
    "trend_direction": "up|down|sideways|mixed",
    "entry_quality": "excellent|good|fair|poor based on visible entries",
    "exit_timing": "excellent|good|fair|poor based on visible exits"
  },
  "risk_assessment": {
    "position_sizing": "consistent|inconsistent|aggressive|conservative",
    "stop_losses": "visible|not visible|inconsistent",
    "leverage_usage": "conservative|moderate|high|excessive",
    "risk_score": "1-10 based on visible evidence"
  },
  "trader_behavior": {
    "discipline_signs": ["positive behaviors observed"],
    "warning_signs": ["concerning patterns visible"],
    "emotional_indicators": ["signs of emotional trading"],
    "experience_level": "beginner|intermediate|advanced|expert"
  },
  "strengths": [
    "Specific strength with screenshot evidence",
    "Another strength backed by visible data"
  ],
  "improvements": [
    "Improvement area with specific visual evidence",
    "Another area needing attention with screenshot proof"
  ],
  "recommendations": [
    "Actionable recommendation based on what you see",
    "Specific next step derived from screenshot analysis"
  ],
  "key_insights": [
    "Critical insight from visual analysis",
    "Important observation from screenshots"
  ]
}

**CRITICAL INSTRUCTIONS:**
- Base analysis ONLY on what you can see in screenshots
- If you cannot see specific data, state "not visible" 
- Extract exact numbers when possible
- Focus on visual evidence, not assumptions
- Provide specific screenshot-based insights
- No generic advice - only data-driven observations`;

// Enhanced Google AI call with proper error handling
async function callGoogleAIWithEnhancedHandling(
  apiKey: string,
  modelName: string,
  contents: any[],
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Deconstructor Agent - AI API attempt ${attempt}/${maxRetries}`
      );

      const response = await callGoogleAI(apiKey, modelName, contents);

      // Validate response structure
      if (!response || typeof response !== "string") {
        throw new Error("Invalid response format from AI API");
      }

      // Check if response is valid JSON
      try {
        JSON.parse(response);
      } catch (parseError) {
        throw new Error("AI response is not valid JSON");
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Deconstructor Agent - Attempt ${attempt} failed:`,
        error.message
      );

      // Handle specific error types
      if (
        error.message.includes("MAX_TOKENS") ||
        error.message.includes("finishReason")
      ) {
        console.log(
          "Deconstructor Agent - MAX_TOKENS error detected, trying with reduced prompt"
        );

        // If this is a MAX_TOKENS error, we'll handle it differently on retry
        if (attempt < maxRetries) {
          // Reduce prompt complexity for next attempt
          contents[0].parts[0].text = contents[0].parts[0].text.replace(
            /Analyze.*trading journal entries: \[.*?\]/s,
            "Analyze the provided trading data focusing on key performance metrics."
          );

          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(
            `Deconstructor Agent - Retrying in ${delay}ms with simplified prompt...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Handle rate limiting
      if (
        error.message.includes("429") ||
        error.message.includes("quota") ||
        error.message.includes("RATE_LIMIT")
      ) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 30000; // 30s, 60s, 120s
          console.log(
            `Deconstructor Agent - Rate limit hit, retrying in ${
              delay / 1000
            }s...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error(
            "API quota exceeded. Please try again in a few minutes. The free tier has limited requests per day."
          );
        }
      }

      // For other errors, don't retry
      throw error;
    }
  }

  throw lastError!;
}

// Generate fallback analysis when AI fails
function generateFallbackAnalysis(
  tradesCount: number,
  screenshotsCount: number
): string {
  const fallbackAnalysis = {
    overall_performance: {
      summary: "Analysis temporarily unavailable due to AI processing limits",
      screenshots_analyzed: screenshotsCount,
      trades_analyzed: tradesCount,
      risk_score: "Medium",
      confidence_level: "Low",
    },
    performance_metrics: {
      win_rate: "Unable to calculate",
      profit_factor: "Unable to calculate",
      risk_reward_ratio: "Unable to calculate",
      max_drawdown: "Unable to calculate",
      execution_quality: "Unable to assess",
    },
    visual_analysis: {
      chart_patterns_identified: ["Analysis pending"],
      technical_indicators_used: ["Analysis pending"],
      setup_quality: "Unable to assess",
      entry_timing: "Unable to assess",
      exit_strategy: "Analysis pending",
    },
    key_insights: [
      "Analysis temporarily unavailable",
      "Please try again in a few minutes",
      "Check your recent trading journal entries",
    ],
    strengths: [
      "Data collection is active",
      "Trading journal is being maintained",
      "Screenshots are being captured",
    ],
    improvements: [
      "Try again when AI processing is available",
      "Ensure trading journal entries are complete",
      "Consider reducing screenshot complexity",
    ],
    recommendations: [
      "1. Retry analysis in a few minutes",
      "2. Continue maintaining detailed trading records",
      "3. Focus on consistent journaling practices",
    ],
    performance_evolution: {
      trend: "Stable",
      progression_summary: "Analysis pending due to processing limitations",
    },
  };

  return JSON.stringify(fallbackAnalysis);
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      throw new Error("Missing required environment variables.");
    }

    const { user_id, file_urls = [] }: DeconstructorRequest = await req.json();
    if (!user_id) {
      console.error("user_id is required");
      throw new Error("user_id is required.");
    }

    console.log("Deconstructor Agent - Processing request for user:", user_id);
    console.log(
      "Deconstructor Agent - Screenshots to analyze:",
      file_urls.length
    );

    // Use service role key for database operations to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile and personalization data for enhanced analysis
    console.log("Deconstructor Agent - Fetching user profile...");
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("real_name, display_name, trader_level")
      .eq("id", user_id)
      .single();

    // Fetch user trading profile for personalization
    const { data: tradingProfile, error: tradingProfileError } = await supabase
      .from("user_trading_profiles")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    // Fetch user preferences
    const { data: userPreferences, error: preferencesError } = await supabase
      .from("user_personalization_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    // Fetch recent analysis history for context
    const { data: analysisHistory, error: historyError } = await supabase
      .from("screenshot_analysis_history")
      .select("patterns_detected, trading_style_indicators, performance_metrics, platform_identified")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (profileError) {
      console.error(
        "Deconstructor Agent - Error fetching user profile:",
        profileError
      );
      throw new Error("Failed to fetch user profile information");
    }

    const userName =
      userProfile?.display_name || userProfile?.real_name || "Trader";
    const traderLevel = userProfile?.trader_level || "Beginner";
    
    console.log("Deconstructor Agent - User name resolved:", userName);
    console.log("Deconstructor Agent - Trading profile loaded:", !!tradingProfile);
    console.log("Deconstructor Agent - User preferences loaded:", !!userPreferences);
    console.log("Deconstructor Agent - Analysis history entries:", analysisHistory?.length || 0);

    // Fetch trading journal data
    console.log("Deconstructor Agent - Fetching trading journal data...");
    const { data: trades, error: fetchError } = await supabase
      .from("trade_journal_entries")
      .select(
        "asset_ticker, trade_type, entry_price, exit_price, notes, pnl, trade_date"
      )
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error("Deconstructor Agent - Error fetching trades:", fetchError);
      throw fetchError;
    }

    const sanitizedTrades =
      trades?.map((trade) => ({
        ...trade,
        notes: sanitizeText(trade.notes),
      })) || [];

    console.log(
      "Deconstructor Agent - Trades fetched:",
      sanitizedTrades.length
    );

    // Build the contents array for Google AI API - PRIORITIZE VISUAL ANALYSIS
    const contents = [];

    // Create personalized prompt based on user data
    let mainContent = SYSTEM_PROMPT;

    // Add personalization context
    let personalizationContext = `\n\n--- PERSONALIZED ANALYSIS FOR ${userName.toUpperCase()} ---\n`;
    personalizationContext += `Trader Level: ${traderLevel}\n`;
    
    if (tradingProfile) {
      personalizationContext += `Known Trading Style: ${tradingProfile.trading_style || 'Unknown'}\n`;
      personalizationContext += `Risk Tolerance: ${tradingProfile.risk_tolerance}\n`;
      personalizationContext += `Preferred Assets: ${JSON.stringify(tradingProfile.preferred_assets)}\n`;
      personalizationContext += `Platform History: ${tradingProfile.platform_detected || 'Unknown'}\n`;
    }

    if (userPreferences) {
      personalizationContext += `Analysis Depth Preference: ${userPreferences.analysis_depth}\n`;
      personalizationContext += `Focus Areas: ${JSON.stringify(userPreferences.focus_areas)}\n`;
      personalizationContext += `Feedback Style: ${userPreferences.feedback_style}\n`;
    }

    if (analysisHistory && analysisHistory.length > 0) {
      personalizationContext += `\nPrevious Analysis Patterns:\n`;
      analysisHistory.forEach((history, index) => {
        personalizationContext += `- Session ${index + 1}: Platform ${history.platform_identified || 'Unknown'}\n`;
        if (history.patterns_detected) {
          personalizationContext += `  Patterns: ${JSON.stringify(history.patterns_detected).slice(0, 100)}...\n`;
        }
      });
    }

    personalizationContext += `\nTailor your analysis to ${userName}'s specific experience level and provide insights that build on their previous sessions.\n`;
    
    mainContent += personalizationContext;

    // Add screenshot analysis section if images are provided (PRIMARY FOCUS)
    if (file_urls.length > 0) {
      mainContent += `\n\n--- PRIMARY VISUAL ANALYSIS ---\nFocus your analysis on these ${file_urls.length} trading screenshots for ${userName}. Extract all visible trading data, patterns, and behaviors from the images.`;
      mainContent += `\n\nSCREENSHOT ANALYSIS INSTRUCTIONS:\n- Examine each image for trading platform data, P&L, position sizes, chart patterns\n- Calculate performance metrics from visible trades\n- Identify risk management practices visible in the screenshots\n- Note any emotional trading patterns visible in execution data\n- Compare current performance with ${userName}'s historical patterns if available`;
    } else {
      mainContent += `\n\n--- NO SCREENSHOTS PROVIDED ---\nNo visual data available for analysis. Provide recommendations for capturing screenshots for future analysis.`;
    }

    // Add minimal trading journal data only as supplementary context
    if (sanitizedTrades.length > 0) {
      const condensedTrades = sanitizedTrades.slice(0, 5).map((trade) => ({
        ticker: trade.asset_ticker,
        pnl: trade.pnl,
        date: trade.trade_date,
        notes: trade.notes ? trade.notes.substring(0, 50) : null,
      }));

      mainContent += `\n\n--- SUPPLEMENTARY CONTEXT ---\nIf screenshots lack detail, use this minimal trading data as context only: ${JSON.stringify(condensedTrades)}`;
    }

    mainContent += `\n\nProvide comprehensive visual analysis in the specified JSON format, focusing primarily on what you can see in the uploaded screenshots.`;

    // Start with the text part
    const parts = [{ text: mainContent }];

    // Add image parts if screenshots are provided (limit to 3 for token efficiency)
    if (file_urls.length > 0) {
      console.log("Deconstructor Agent - Processing images...");
      const imagesToProcess = file_urls.slice(0, 3); // Limit to 3 images

      for (const imageUrl of imagesToProcess) {
        try {
          console.log("Deconstructor Agent - Processing image:", imageUrl);
          const base64Image = await imageUrlToBase64(imageUrl);
          const mimeType = getMimeTypeFromUrl(imageUrl);

          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          });

          console.log(
            "Deconstructor Agent - Image processed successfully:",
            imageUrl
          );
        } catch (error) {
          console.error(
            "Deconstructor Agent - Error processing image:",
            imageUrl,
            error
          );
          // Add error placeholder instead of failing completely
          parts.push({
            text: `[Error processing screenshot: ${imageUrl}]`,
          });
        }
      }
    }

    // Create the contents array in the format expected by Google AI
    contents.push({
      parts: parts,
    });

    const modelName = "gemini-2.5-pro";

    console.log(
      "Deconstructor Agent - Calling Google AI with enhanced error handling..."
    );

    let analysisResponse: string;

    try {
      // Try enhanced AI call with proper error handling
      analysisResponse = await callGoogleAIWithEnhancedHandling(
        apiKey,
        modelName,
        contents,
        3 // max retries
      );
    } catch (error) {
      console.error(
        "Deconstructor Agent - AI analysis failed, using fallback:",
        error.message
      );

      // Generate fallback analysis
      analysisResponse = generateFallbackAnalysis(
        sanitizedTrades.length,
        file_urls.length
      );
    }

    console.log(
      "Deconstructor Agent - Analysis response generated:",
      analysisResponse.substring(0, 200) + "..."
    );

    // Store analysis in agent_outputs table
    console.log("Deconstructor Agent - Storing agent output...");
    const { error: agentOutputError } = await supabase
      .from("agent_outputs")
      .insert({
        user_id,
        agent_name: "Deconstructor",
        output_text: analysisResponse,
        user_readable_text: analysisResponse,
        metadata: {
          screenshots_analyzed: file_urls.length,
          trades_analyzed: sanitizedTrades.length,
          analysis_type: "comprehensive_pattern_analysis",
          model_used: modelName,
          processing_status: analysisResponse.includes(
            "temporarily unavailable"
          )
            ? "fallback"
            : "success",
        },
      });

    if (agentOutputError) {
      console.error(
        "Deconstructor Agent - Error storing agent output:",
        agentOutputError
      );
    } else {
      console.log("Deconstructor Agent - Agent output stored successfully");
    }

    // Store screenshot analysis history for personalization learning
    if (file_urls.length > 0) {
      try {
        const analysisData = JSON.parse(analysisResponse);
        
        const { error: historyError } = await supabase
          .from("screenshot_analysis_history")
          .insert({
            user_id,
            analysis_session_id: crypto.randomUUID(),
            screenshot_urls: file_urls,
            extracted_data: analysisData.extracted_metrics || {},
            patterns_detected: analysisData.visual_patterns || {},
            platform_identified: analysisData.screenshot_analysis?.platform_detected,
            timeframe_detected: analysisData.screenshot_analysis?.visible_timeframe,
            assets_identified: sanitizedTrades.map(t => t.asset_ticker).filter((v, i, a) => a.indexOf(v) === i),
            trading_style_indicators: analysisData.trader_behavior || {},
            performance_metrics: {
              win_rate: analysisData.extracted_metrics?.win_rate,
              risk_score: analysisData.risk_assessment?.risk_score,
              experience_level: analysisData.trader_behavior?.experience_level
            }
          });

        if (!historyError) {
          console.log("Deconstructor Agent - Analysis history stored for learning");
          
          // Update user trading profile based on new analysis
          if (analysisData.screenshot_analysis?.platform_detected || analysisData.trader_behavior?.experience_level) {
            await supabase.rpc('update_trading_profile_from_analysis', {
              p_user_id: user_id,
              p_analysis_data: {
                trading_style: analysisData.trader_behavior?.experience_level,
                platform_detected: analysisData.screenshot_analysis?.platform_detected,
                performance_metrics: analysisData.extracted_metrics
              }
            });
            console.log("Deconstructor Agent - Trading profile updated");
          }
        }
      } catch (parseError) {
        console.error("Deconstructor Agent - Error parsing analysis for history:", parseError);
      }
    }

    return new Response(JSON.stringify({ reply: analysisResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Deconstructor Agent Error:", error.message);
    console.error("Deconstructor Agent Stack:", error.stack);

    // Generate fallback response for critical errors
    const fallbackResponse = generateFallbackAnalysis(0, 0);

    return new Response(
      JSON.stringify({
        reply: fallbackResponse,
        error: `Analysis temporarily unavailable: ${error.message}`,
        fallback: true,
      }),
      {
        status: 200, // Return 200 with fallback instead of 500
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
