import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAI } from "../_shared/google-ai-helper.ts";

interface ModuleCoachRequest {
  module_title?: string;
  streak_info?: string;
  badge_info?: string;
}

const MODULE_SYSTEM_PROMPT = `SYSTEM PROMPT — Module Completion Coach

ROLE
You are a motivational coach congratulating users on completing educational modules. Keep it brief, encouraging, and forward-focused.

OUTPUT CONTRACT
- Return ONLY valid JSON as: { "reply": "<coach message>" }
- 2–3 sentences total (≤60-80 words).
- End with a next-step nudge or momentum builder.
- Keep it conversational and uplifting.

STYLE GUARDRAILS
- Always motivational and uplifting.
- Focus on learning commitment and growth mindset.
- Suggest next steps or encourage continued learning.
- Use natural, human tone with contractions.
- No buzzwords or corporate speak.

EXECUTION GOALS
- Celebrate the completion achievement.
- Reinforce the value of continuous learning.
- Encourage forward momentum.
- Keep it concise (≤80 words).

RESPONSE FORMAT
Return ONLY: { "reply": "<2-3 sentence congratulatory message with next-step nudge>" }`;

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

    // Get user ID from JWT token for security
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Use anon key with user's JWT for RLS compliance
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Invalid or expired token");
    }

    const user_id = user.id;
    const { module_title, streak_info, badge_info }: ModuleCoachRequest = await req.json();

    console.log("Module Coach - Processing request:", { user_id, module_title, streak_info });

    // Fetch user profile for personalization
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("real_name, display_name")
      .eq("id", user_id)
      .maybeSingle();

    const userName = userProfile?.display_name || userProfile?.real_name || "Trader";

    // Build compact prompt for module completion
    const moduleInfo = module_title || "a learning module";
    const streakText = streak_info ? ` Your learning streak: ${streak_info}.` : "";
    const badgeText = badge_info ? ` Badge earned: ${badge_info}.` : "";

    const prompt = `${MODULE_SYSTEM_PROMPT}

--- TASK ---
${userName} just completed ${moduleInfo}.${streakText}${badgeText}

Congratulate them on their commitment to education and encourage continued learning.

Return JSON: {"reply": "your 2-3 sentence congratulatory message with next-step nudge"}`;

    const startTime = Date.now();
    let aiResponse = await callGoogleAI(apiKey, "gemini-2.5-flash", prompt, {
      maxOutputTokens: 150,
      timeoutMs: 10000,
      responseSchema: {
        type: "object",
        properties: {
          reply: { type: "string" }
        },
        required: ["reply"],
        additionalProperties: false
      }
    });
    const modelLatencyMs = Date.now() - startTime;

    let fallbackReason: string | null = null;
    let finalReply: string;

    // Check if we got a transport fallback
    try {
      const parsedResponse = JSON.parse(aiResponse);
      if (parsedResponse.is_fallback) {
        fallbackReason = parsedResponse.fallback_reason;
        // Generate simple deterministic fallback for module completion
        const fallbacks = [
          `Great job completing ${moduleInfo}, ${userName}! Your commitment to learning shows real dedication. Keep building that knowledge—it's your competitive edge.`,
          `Nice work finishing ${moduleInfo}, ${userName}! Every lesson learned is another tool in your trading arsenal. What's next on your learning journey?`,
          `Excellent completion of ${moduleInfo}, ${userName}! Your dedication to education sets you apart from the crowd. Keep that momentum going strong.`
        ];
        finalReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        console.log("Module Coach - Using deterministic fallback due to:", fallbackReason);
      } else {
        finalReply = parsedResponse.reply || `Great work completing ${moduleInfo}, ${userName}! Your commitment to learning is building your trading edge. Keep that momentum going!`;
      }
    } catch (parseError) {
      console.error("Module Coach - Failed to parse AI response:", parseError);
      finalReply = `Excellent work completing ${moduleInfo}, ${userName}! Your dedication to education shows real commitment. Keep building that knowledge base!`;
      fallbackReason = 'invalid_json';
    }

    // Log metrics
    console.log("Module Coach - Generation complete:", {
      fallback_reason: fallbackReason,
      model_latency_ms: modelLatencyMs,
      final_reply_len: finalReply.length
    });

    // Store agent output (module completions go to agent_outputs only, not journal entries)
    const { error: agentOutputError } = await supabase
      .from("agent_outputs")
      .insert({
        user_id,
        agent_name: "Module Coach",
        output_text: JSON.stringify({ reply: finalReply, fallback_reason, module: moduleInfo }),
        user_readable_text: finalReply,
      });

    if (agentOutputError) {
      console.error("Module Coach - Error storing agent output:", agentOutputError);
    }

    return new Response(
      JSON.stringify({ reply: finalReply, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Module Coach - Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});