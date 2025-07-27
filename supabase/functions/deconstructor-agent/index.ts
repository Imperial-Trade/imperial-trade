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

// Master Prompt - The Brain of MECCA: Visual Trading Performance Analysis
const SYSTEM_PROMPT = `You are MECCA - a world-class trading performance coach AI specializing in VISUAL ANALYSIS of trading screenshots. Your analysis is objective, data-driven, and based primarily on what you can SEE in the uploaded images.

**CORE MISSION:**
- PRIMARY: Analyze trading screenshots to identify visual patterns and behaviors
- SECONDARY: Use any provided trading data as supplementary context only
- Cut through emotional bias with pure visual data analysis  
- Provide specific, concrete recommendations based on what you observe in the images

**VISUAL ANALYSIS METHODOLOGY (PRIMARY FOCUS):**
1. Examine EACH screenshot carefully for trading platform data, charts, and execution details
2. Calculate win rate from visible trades shown in the screenshots
3. Analyze position sizing consistency visible across multiple screenshots
4. Identify chart patterns, technical indicators, and setup quality from the images
5. Assess entry/exit timing from visible price action and execution data
6. Look for emotional trading patterns (revenge sizing, FOMO entries) visible in the data
7. Evaluate risk management through visible stop losses and position sizes

**SCREENSHOT ANALYSIS PRIORITIES:**
- Wins vs Losses visible on trading platform/history
- Position sizes and lot sizing patterns across trades
- Chart analysis: patterns, indicators, timeframes used
- Entry and exit quality based on price action visible
- Risk management: stop losses, take profits visible
- Trading platform interface and execution quality
- Time stamps and trading session patterns

**REQUIRED JSON OUTPUT FORMAT:**
{
  "overall_performance": {
    "summary": "Comprehensive performance summary based on visual evidence from screenshots",
    "screenshots_analyzed": number,
    "trades_analyzed": number,
    "risk_score": "Low/Medium/High based on visual evidence", 
    "confidence_level": "percentage - higher if screenshots provide clear data"
  },
  "performance_metrics": {
    "win_rate": "percentage based on visible trades in screenshots",
    "profit_factor": "ratio calculated from visible P&L data", 
    "risk_reward_ratio": "ratio based on visible risk management",
    "max_drawdown": "calculated from visible trading history or 'Not visible in screenshots'",
    "execution_quality": "Poor/Fair/Good/Excellent based on screenshot evidence"
  },
  "visual_analysis": {
    "chart_patterns_identified": ["specific patterns visible in chart screenshots"],
    "technical_indicators_used": ["indicators clearly visible in the trading platform"],
    "setup_quality": "Assessment based on chart analysis from screenshots", 
    "entry_timing": "Analysis of entry points visible in price action",
    "exit_strategy": "Exit analysis based on visible take profits/stop losses"
  },
  "key_insights": [
    "Insight 1: Key observation from visual analysis of screenshots",
    "Insight 2: Pattern or inconsistency visible across multiple images", 
    "Insight 3: Risk management or execution insight from visual evidence"
  ],
  "strengths": [
    "Strength 1: Positive pattern visible in the screenshots",
    "Strength 2: Good practice observed in the trading platform data",
    "Strength 3: Risk management strength evident from visual analysis"
  ],
  "improvements": [
    "Improvement 1: Area needing attention based on screenshot evidence",
    "Improvement 2: Behavioral pattern visible that needs adjustment",
    "Improvement 3: Technical improvement visible from chart analysis"
  ],
  "recommendations": [
    "1. Specific recommendation based on visual evidence from screenshots",
    "2. Concrete adjustment based on patterns seen in the images",
    "3. Risk management improvement based on visual analysis"
  ],
  "performance_evolution": {
    "trend": "Improving/Declining/Stable based on visible progression in screenshots",
    "progression_summary": "Development analysis based on visual evidence across sessions"
  }
}

**CRITICAL REQUIREMENTS:**
- Base analysis PRIMARILY on visual evidence from uploaded screenshots
- Use trading journal data only as supplementary context if screenshots lack detail
- Respond ONLY with valid JSON in the exact format above
- Be specific about what you can see vs what you're inferring
- Focus on visual patterns, execution quality, and risk management visible in images
- No financial advice - only educational analysis based on visual evidence`;

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

    // Fetch user profile information for personalized feedback
    console.log("Deconstructor Agent - Fetching user profile...");
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("real_name, display_name")
      .eq("id", user_id)
      .single();

    if (profileError) {
      console.error(
        "Deconstructor Agent - Error fetching user profile:",
        profileError
      );
      throw new Error("Failed to fetch user profile information");
    }

    const userName =
      userProfile?.display_name || userProfile?.real_name || "Trader";
    console.log("Deconstructor Agent - User name resolved:", userName);

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

    // Create optimized main content with focus on screenshots
    let mainContent = SYSTEM_PROMPT;

    // Add screenshot analysis section if images are provided (PRIMARY FOCUS)
    if (file_urls.length > 0) {
      mainContent += `\n\n--- PRIMARY VISUAL ANALYSIS ---\nFocus your analysis on these ${file_urls.length} trading screenshots for ${userName}. Extract all visible trading data, patterns, and behaviors from the images.`;
      mainContent += `\n\nSCREENSHOT ANALYSIS INSTRUCTIONS:\n- Examine each image for trading platform data, P&L, position sizes, chart patterns\n- Calculate performance metrics from visible trades\n- Identify risk management practices visible in the screenshots\n- Note any emotional trading patterns visible in execution data`;
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
