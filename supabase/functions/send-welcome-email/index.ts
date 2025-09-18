
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from "../_shared/cors.ts"
import { isEmailEnabled, hashId, sanitizeError } from "../_shared/notify.ts"

// Initialize Resend
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name } = await req.json()

    // Early suppression check with sanitized logging
    if (!isEmailEnabled()) {
      const hashedEmail = await hashId(email);
      console.log(`event=EMAIL_SUPPRESSED hashed_email=${hashedEmail} reason=EMAIL_DISABLED`);
      return new Response(
        JSON.stringify({ suppressed: true, reason: 'Email notifications disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error('Missing Resend API key')
    }

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const html = `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff;">
        <div style="background: linear-gradient(135deg, #c09a58, #e6d3b3); padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #0a0a0a;">Trade Imperial</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: #333;">Elite Trading Community</p>
        </div>
        
        <div style="padding: 40px 20px;">
          <h2 style="color: #c09a58; font-size: 24px; margin-bottom: 20px;">Welcome to Exclusive Access, ${name}!</h2>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Congratulations! Your account has been approved and you now have exclusive access to Trade Imperial's premium features.
          </p>
          
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #c09a58; margin-top: 0;">What's included in your membership:</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #c09a58;">✓</span>
                Live trading sessions with professional traders
              </li>
              <li style="margin: 10px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #c09a58;">✓</span>
                Advanced trading tools and analytics
              </li>
              <li style="margin: 10px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #c09a58;">✓</span>
                Exclusive market insights and signals
              </li>
              <li style="margin: 10px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #c09a58;">✓</span>
                Community forum access
              </li>
              <li style="margin: 10px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #c09a58;">✓</span>
                Educational resources and courses
              </li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
            You can now access your dashboard and start your journey to trading mastery.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('SITE_URL') || 'https://tradeimperial.com'}/dashboard/home" 
               style="background: #c09a58; color: #0a0a0a; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Access Your Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #1a1a1a; padding: 20px; text-align: center; border-top: 1px solid #333;">
          <p style="margin: 0; color: #888; font-size: 14px;">
            © ${new Date().getFullYear()} Trade Imperial. All rights reserved.
          </p>
        </div>
      </div>
    `;

    // Send via Resend
    const result = await resend.emails.send({
      from: "Trade Imperial <welcome@tradeimperial.com>",
      to: [email],
      subject: "🎉 Welcome to Trade Imperial - Exclusive Access Granted",
      html: html,
      text: `
        Welcome to Exclusive Access, ${name}!
        
        Congratulations! Your account has been approved and you now have exclusive access to Trade Imperial's premium features.
        
        What's included in your membership:
        • Live trading sessions with professional traders
        • Advanced trading tools and analytics
        • Exclusive market insights and signals
        • Community forum access
        • Educational resources and courses
        
        You can now access your dashboard and start your journey to trading mastery.
        
        Access Your Dashboard: ${Deno.env.get('SITE_URL') || 'https://tradeimperial.com'}/dashboard/home
        
        © ${new Date().getFullYear()} Trade Imperial. All rights reserved.
      `
    });

    const hashedEmail = await hashId(email);
    console.log(`event=EMAIL_SUCCESS hashed_email=${hashedEmail} provider=Resend`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const hashedEmail = await hashId(email || 'unknown');
    const sanitizedError = sanitizeError(error);
    console.error(`event=EMAIL_ERROR hashed_email=${hashedEmail} error=${sanitizedError}`);
    return new Response(
      JSON.stringify({ error: 'Failed to send welcome email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
