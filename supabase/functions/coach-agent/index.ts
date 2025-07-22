
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { callGoogleAI } from "../_shared/google-ai-helper.ts";

interface CoachRequest {
  event_type: "LOG_TRADE" | "MODULE_COMPLETE";
  user_id: string;
  journal_entry_id?: string;
}

const SYSTEM_PROMPT = `You are "Zenith," an elite performance coach for professional traders. Your tone is composed, encouraging, and insightful. Your primary objective is to cultivate the mindset, discipline, and resilience required for long-term trading success.
**Core Directives:**
1.  **Reinforce Process, Not Outcome:** The financial result of any single trade is irrelevant. Your focus is exclusively on the trader's adherence to their documented process. Praise disciplined execution, even on losing trades.
2.  **Acknowledge the Psychological Game:** Trading is a mental endeavor. Acknowledge the difficulty of managing emotions like fear and greed. Frame journaling as a professional 'debriefing' and a tool for emotional regulation.
3.  **Build Professional Identity:** Use language that frames the user's actions in a professional context. For example, "That level of disciplined execution is a hallmark of a professional operator," or "You're developing the objective mindset required to manage risk effectively."
4.  **Recognize Consistency:** Milestones like journaling streaks are evidence of professional habit formation. Highlight these as foundational to building a successful trading career.
**Execution Rule:** Your feedback should be concise, impactful, and always reinforce the user's journey toward professional mastery.`;

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

    const { event_type, user_id, journal_entry_id }: CoachRequest = await req.json();
    if (!event_type || !user_id) {
      throw new Error("event_type and user_id are required.");
    }

    console.log("Coach Agent - Processing request:", { event_type, user_id, journal_entry_id });

    let userActionPrompt = "";
    if (event_type === "LOG_TRADE") {
      userActionPrompt = `The user (ID: ${user_id}) just logged a trade entry. Praise them for their discipline in journaling. Journal Entry ID: ${journal_entry_id}`;
    } else if (event_type === "MODULE_COMPLETE") {
      userActionPrompt = `The user (ID: ${user_id}) just completed a learning module. Congratulate them on their commitment to education.`;
    } else {
      throw new Error(`Unsupported event_type: ${event_type}`);
    }

    const fullPrompt = `${SYSTEM_PROMPT}\n\n--- TASK ---\n${userActionPrompt}`;
    const modelName = "gemini-1.5-flash-latest";

    console.log("Coach Agent - Generating AI response...");
    const coachResponse = await callGoogleAI(apiKey, modelName, fullPrompt);
    console.log("Coach Agent - AI response generated:", coachResponse.substring(0, 100) + "...");

    // Use service role key for database operations to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the coach output in agent_outputs table
    console.log("Coach Agent - Storing agent output...");
    const { error: agentOutputError } = await supabase.from("agent_outputs").insert({
      user_id,
      agent_name: "Coach",
      output_text: coachResponse,
    });

    if (agentOutputError) {
      console.error("Coach Agent - Error storing agent output:", agentOutputError);
    } else {
      console.log("Coach Agent - Agent output stored successfully");
    }

    // If this is a trade log event and we have a journal entry ID, update the journal entry
    if (event_type === "LOG_TRADE" && journal_entry_id) {
      console.log("Coach Agent - Updating journal entry with coaching feedback...");
      
      try {
        const { data: updateResult, error: updateError } = await supabase
          .from("trade_journal_entries")
          .update({ ai_positive_feedback: coachResponse })
          .eq("id", journal_entry_id)
          .eq("user_id", user_id) // Extra security check
          .select();

        if (updateError) {
          console.error("Coach Agent - Error updating journal entry:", updateError);
          return new Response(JSON.stringify({ 
            reply: coachResponse,
            warning: "Feedback generated but failed to update journal entry",
            error: updateError.message 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!updateResult || updateResult.length === 0) {
          console.error("Coach Agent - No journal entry found to update");
          return new Response(JSON.stringify({ 
            reply: coachResponse,
            warning: "Feedback generated but journal entry not found for update"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log("Coach Agent - Journal entry updated successfully:", updateResult[0]);
      } catch (updateException) {
        console.error("Coach Agent - Exception during journal entry update:", updateException);
        return new Response(JSON.stringify({ 
          reply: coachResponse,
          warning: "Feedback generated but update failed due to exception",
          error: updateException.message 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ reply: coachResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Coach Agent Error:", error.message);
    return new Response(
      JSON.stringify({ error: `Coach Agent failed: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
