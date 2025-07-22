
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAI } from "../_shared/google-ai-helper.ts";
import { sanitizeText } from "../_shared/sanitizer.ts";

interface DeconstructorRequest {
  user_id: string;
  file_urls?: string[];
}

// Helper function to convert image URL to base64
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    console.log('Converting image to base64:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    console.log('Image converted to base64 successfully, size:', base64String.length);
    return base64String;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

// Helper function to detect MIME type from URL
function getMimeTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg'; // Default fallback
  }
}

const SYSTEM_PROMPT = `You are "Helios," a quantitative performance analyst AI specializing in educational trading analysis. Your function is to provide objective, data-driven analysis combining both visual trading screenshots and historical journal data. Your tone is neutral, precise, and analytical.

**Analysis Scope:**
- When screenshots are provided: Analyze chart patterns, setups, technical indicators, and visual trading decisions
- Always analyze trading journal data for performance metrics and behavioral patterns
- Combine visual and historical data for comprehensive educational insights

**Output Format:** Your analysis must be structured as a JSON object with the following sections:

{
  "overall_performance": {
    "summary": "Brief overall performance summary",
    "screenshots_analyzed": number,
    "trades_analyzed": number,
    "risk_score": "Low/Medium/High",
    "confidence_level": "percentage"
  },
  "performance_metrics": {
    "win_rate": "percentage",
    "profit_factor": "ratio",
    "risk_reward_ratio": "ratio",
    "max_drawdown": "percentage",
    "execution_quality": "Poor/Fair/Good/Excellent"
  },
  "visual_analysis": {
    "chart_patterns_identified": ["pattern1", "pattern2"],
    "technical_indicators_used": ["indicator1", "indicator2"],
    "setup_quality": "Poor/Fair/Good/Excellent",
    "entry_timing": "Early/Optimal/Late",
    "exit_strategy": "analysis of exit decisions"
  },
  "key_insights": [
    "Insight 1: Behavioral observation",
    "Insight 2: Pattern recognition",
    "Insight 3: Decision-making analysis"
  ],
  "strengths": [
    "Strength 1: Positive pattern identified",
    "Strength 2: Good trading behavior",
    "Strength 3: Consistent execution"
  ],
  "improvements": [
    "Improvement 1: Area needing attention",
    "Improvement 2: Behavioral adjustment needed",
    "Improvement 3: Technical skill development"
  ],
  "recommendations": [
    "1. Specific actionable recommendation",
    "2. Educational development suggestion",
    "3. Risk management improvement"
  ],
  "performance_evolution": {
    "trend": "Improving/Declining/Stable",
    "progression_summary": "Analysis of trading development over time"
  }
}

**Execution Rule:** Do not provide financial advice, motivation, or predictions. Your sole purpose is to reflect the data back to the user in a structured, educational format for learning purposes only.`;

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
    console.log("Deconstructor Agent - Screenshots to analyze:", file_urls.length);

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
      console.error("Deconstructor Agent - Error fetching user profile:", profileError);
      throw new Error("Failed to fetch user profile information");
    }

    const userName = userProfile?.display_name || userProfile?.real_name || "Trader";
    console.log("Deconstructor Agent - User name resolved:", userName);

    // Fetch trading journal data
    console.log("Deconstructor Agent - Fetching trading journal data...");
    const { data: trades, error: fetchError } = await supabase
      .from("trade_journal_entries")
      .select("asset_ticker, trade_type, entry_price, exit_price, notes, pnl, trade_date")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error("Deconstructor Agent - Error fetching trades:", fetchError);
      throw fetchError;
    }

    const sanitizedTrades = trades?.map((trade) => ({
      ...trade,
      notes: sanitizeText(trade.notes),
    })) || [];

    console.log("Deconstructor Agent - Trades fetched:", sanitizedTrades.length);

    // Build the contents array for Google AI API
    const contents = [];
    
    // Create the main text content
    let mainContent = SYSTEM_PROMPT;
    
    // Add screenshot analysis section if images are provided
    if (file_urls.length > 0) {
      mainContent += `\n\n--- VISUAL ANALYSIS ---\nAnalyze the following ${file_urls.length} trading screenshots for ${userName}:`;
    }
    
    // Add trading journal data
    mainContent += `\n\n--- TRADING JOURNAL DATA ---\nAnalyze ${userName}'s trading journal entries: ${JSON.stringify(sanitizedTrades)}`;
    
    mainContent += `\n\nProvide a comprehensive educational analysis in the specified JSON format, combining insights from both visual screenshots (if provided) and trading journal data.`;

    // Start with the text part
    const parts = [{ text: mainContent }];

    // Add image parts if screenshots are provided
    if (file_urls.length > 0) {
      console.log("Deconstructor Agent - Processing images...");
      for (const imageUrl of file_urls) {
        try {
          console.log("Deconstructor Agent - Processing image:", imageUrl);
          const base64Image = await imageUrlToBase64(imageUrl);
          const mimeType = getMimeTypeFromUrl(imageUrl);
          
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          });
          
          console.log("Deconstructor Agent - Image processed successfully:", imageUrl);
        } catch (error) {
          console.error("Deconstructor Agent - Error processing image:", imageUrl, error);
          // Add error placeholder instead of failing completely
          parts.push({
            text: `[Error processing screenshot: ${imageUrl} - ${error.message}]`
          });
        }
      }
    }

    // Create the contents array in the format expected by Google AI
    contents.push({
      parts: parts
    });

    const modelName = "gemini-1.5-flash"; // Use flash model for higher quota limits

    console.log("Deconstructor Agent - Calling Google AI with contents array...");
    
    // Implement rate limiting and retry logic
    let analysisResponse;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Use the updated helper function with the contents array
        analysisResponse = await callGoogleAI(
          apiKey,
          modelName,
          contents
        );
        break; // Success, exit retry loop
      } catch (error) {
        console.error(`Deconstructor Agent - Attempt ${retryCount + 1} failed:`, error.message);
        
        // Check if it's a quota/rate limit error
        if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RATE_LIMIT')) {
          retryCount++;
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 30000; // 30s, 60s, 120s
            console.log(`Deconstructor Agent - Rate limit hit, retrying in ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw new Error("API quota exceeded. Please try again in a few minutes. The free tier has limited requests per day.");
          }
        } else {
          throw error; // Re-throw non-quota errors immediately
        }
      }
    }
    
    console.log("Deconstructor Agent - Analysis response generated:", analysisResponse.substring(0, 200) + "...");

    // Store analysis in agent_outputs table
    console.log("Deconstructor Agent - Storing agent output...");
    const { error: agentOutputError } = await supabase.from("agent_outputs").insert({
      user_id,
      agent_name: "Deconstructor",
      output_text: analysisResponse,
      user_readable_text: analysisResponse,
      metadata: {
        screenshots_analyzed: file_urls.length,
        trades_analyzed: sanitizedTrades.length,
        analysis_type: "comprehensive_pattern_analysis"
      }
    });

    if (agentOutputError) {
      console.error("Deconstructor Agent - Error storing agent output:", agentOutputError);
    } else {
      console.log("Deconstructor Agent - Agent output stored successfully");
    }

    return new Response(JSON.stringify({ reply: analysisResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Deconstructor Agent Error:", error.message);
    console.error("Deconstructor Agent Stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: `Deconstructor Agent failed: ${error.message}`,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
