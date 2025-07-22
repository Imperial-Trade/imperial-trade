
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
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return base64String;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
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
      throw new Error("Missing required environment variables.");
    }

    const { user_id, file_urls = [] }: DeconstructorRequest = await req.json();
    if (!user_id) throw new Error("user_id is required.");

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
    const { data: trades, error: fetchError } = await supabase
      .from("trade_journal_entries")
      .select("asset_ticker, trade_type, entry_price, exit_price, notes, pnl, trade_date")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (fetchError) throw fetchError;

    const sanitizedTrades = trades?.map((trade) => ({
      ...trade,
      notes: sanitizeText(trade.notes),
    })) || [];

    // Prepare the content for Google AI API
    const contents = [];
    
    // Create the main content part with system prompt and context
    let mainContent = SYSTEM_PROMPT;
    
    // Add screenshot analysis section if images are provided
    if (file_urls.length > 0) {
      mainContent += `\n\n--- VISUAL ANALYSIS ---\nAnalyze the following ${file_urls.length} trading screenshots for ${userName}:`;
    }
    
    // Add trading journal data
    mainContent += `\n\n--- TRADING JOURNAL DATA ---\nAnalyze ${userName}'s trading journal entries: ${JSON.stringify(sanitizedTrades)}`;
    
    mainContent += `\n\nProvide a comprehensive educational analysis in the specified JSON format, combining insights from both visual screenshots (if provided) and trading journal data.`;

    // Start building the parts array for this content
    const parts = [{ text: mainContent }];

    // Add image parts if screenshots are provided
    if (file_urls.length > 0) {
      for (const imageUrl of file_urls) {
        try {
          const base64Image = await imageUrlToBase64(imageUrl);
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          });
        } catch (error) {
          console.error("Error processing image:", imageUrl, error);
          parts.push({
            text: `[Error processing screenshot: ${imageUrl}]`
          });
        }
      }
    }

    // Create the contents array with proper structure
    contents.push({
      role: "user",
      parts: parts
    });

    const modelName = "gemini-1.5-pro-latest";

    console.log("Deconstructor Agent - Generating comprehensive analysis...");
    console.log("Contents structure:", JSON.stringify(contents, null, 2));
    
    const analysisResponse = await callGoogleAI(
      apiKey,
      modelName,
      contents
    );
    
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
    return new Response(
      JSON.stringify({ error: `Deconstructor Agent failed: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
