
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    
    const { email, name } = await req.json()

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await resend.emails.send({
      from: 'Imperial Trading <welcome@tradeimperial.com>',
      to: [email],
      subject: 'Welcome to Imperial Trading - Exclusive Access Granted',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff;">
          <div style="background: linear-gradient(135deg, #c09a58, #e6d3b3); padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #0a0a0a;">Imperial Trading</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: #333;">Elite Trading Community</p>
          </div>
          
          <div style="padding: 40px 20px;">
            <h2 style="color: #c09a58; font-size: 24px; margin-bottom: 20px;">Welcome to Exclusive Access, ${name}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Congratulations! Your account has been approved and you now have exclusive access to Imperial Trading's premium features.
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
              © ${new Date().getFullYear()} Imperial Trading. All rights reserved.
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending welcome email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
