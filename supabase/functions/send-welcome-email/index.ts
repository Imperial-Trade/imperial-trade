
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { hashId } from "../_shared/notify.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name } = await req.json()

    // Welcome emails disabled - return success response
    const hashedEmail = await hashId(email);
    console.log(`event=EMAIL_DISABLED hashed_email=${hashedEmail} reason=RESEND_DISABLED`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        disabled: true, 
        message: 'Welcome emails have been disabled' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`event=EMAIL_FUNCTION_ERROR error=${(error as Error).message}`);
    return new Response(
      JSON.stringify({ error: 'Welcome email function disabled' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
