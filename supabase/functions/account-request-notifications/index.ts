
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    
    const { type, requestId, userEmail, userName, adminEmail, reason } = await req.json()

    console.log('Processing notification:', { type, requestId, userEmail })

    switch (type) {
      case 'new_request':
        return await sendNewRequestNotification(resend, supabase, { userEmail, userName })
      
      case 'request_resubmitted':
        return await sendResubmissionNotification(resend, supabase, { userEmail, userName, requestId })
      
      case 'request_approved':
        return await sendApprovalNotification(resend, { userEmail, userName })
      
      case 'request_rejected':
        return await sendRejectionNotification(resend, { userEmail, userName, reason })
      
      case 'admin_daily_digest':
        return await sendDailyDigest(resend, supabase)
      
      case 'test':
        return await sendTestNotification(resend)
      
      default:
        throw new Error(`Unknown notification type: ${type}`)
    }
  } catch (error) {
    console.error('Notification error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function sendNewRequestNotification(resend: any, supabase: any, { userEmail, userName }: any) {
  // Get admin emails
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .or('access_level.eq.admin,role.eq.admin')

  if (!admins || admins.length === 0) {
    console.log('No admin users found')
    return new Response(JSON.stringify({ message: 'No admins to notify' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Get admin user emails from auth
  const adminEmails = ['admin@tradeimperial.com'] // Fallback admin email

  const emailPromises = adminEmails.map(adminEmail => 
    resend.emails.send({
      from: 'Imperial Trading <admin@tradeimperial.com>',
      to: [adminEmail],
      subject: '🚨 New Account Request - Action Required',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
          <div style="background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #1f2937; margin-bottom: 20px; font-size: 24px;">New Account Request</h1>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; color: #92400e; font-weight: 500;">
                ⚠️ A new account request requires your attention
              </p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #374151; margin-bottom: 10px;">Request Details:</h3>
              <ul style="color: #6b7280; line-height: 1.6;">
                <li><strong>Name:</strong> ${userName || 'Not provided'}</li>
                <li><strong>Email:</strong> ${userEmail}</li>
                <li><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('SITE_URL') || 'https://tradeimperial.com'}/dashboard/admin-panel" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                Review Request
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
              <p>You're receiving this because you're an administrator for Imperial Trading.</p>
            </div>
          </div>
        </div>
      `,
    })
  )

  await Promise.all(emailPromises)

  return new Response(JSON.stringify({ success: true, message: 'Admin notifications sent' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function sendResubmissionNotification(resend: any, supabase: any, { userEmail, userName, requestId }: any) {
  const adminEmails = ['admin@tradeimperial.com']

  const emailPromises = adminEmails.map(adminEmail => 
    resend.emails.send({
      from: 'Imperial Trading <admin@tradeimperial.com>',
      to: [adminEmail],
      subject: '🔄 Account Request Resubmitted - Review Required',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
          <div style="background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #1f2937; margin-bottom: 20px; font-size: 24px;">Request Resubmitted</h1>
            
            <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; color: #1e40af; font-weight: 500;">
                🔄 A previously rejected request has been resubmitted with updates
              </p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="color: #374151; margin-bottom: 10px;">Resubmission Details:</h3>
              <ul style="color: #6b7280; line-height: 1.6;">
                <li><strong>Name:</strong> ${userName || 'Not provided'}</li>
                <li><strong>Email:</strong> ${userEmail}</li>
                <li><strong>Resubmitted:</strong> ${new Date().toLocaleString()}</li>
                <li><strong>Request ID:</strong> ${requestId}</li>
              </ul>
            </div>
            
            <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0; color: #374151; font-size: 14px;">
                This user has addressed the previous rejection reasons and resubmitted their application. Please review the updated information.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('SITE_URL') || 'https://tradeimperial.com'}/dashboard/admin-panel" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                Review Resubmission
              </a>
            </div>
          </div>
        </div>
      `,
    })
  )

  await Promise.all(emailPromises)

  return new Response(JSON.stringify({ success: true, message: 'Resubmission notifications sent' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function sendApprovalNotification(resend: any, { userEmail, userName }: any) {
  const { data, error } = await resend.emails.send({
    from: 'Imperial Trading <welcome@tradeimperial.com>',
    to: [userEmail],
    subject: '🎉 Welcome to Imperial Trading - Account Approved!',
    html: `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff;">
        <div style="background: linear-gradient(135deg, #c09a58, #e6d3b3); padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #0a0a0a;">Imperial Trading</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: #333;">Elite Trading Community</p>
        </div>
        
        <div style="padding: 40px 20px;">
          <h2 style="color: #c09a58; font-size: 24px; margin-bottom: 20px;">🎉 Congratulations, ${userName || 'Trader'}!</h2>
          
          <div style="background: #16a34a; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
            <h3 style="color: #ffffff; margin: 0; font-size: 18px;">✅ Your Account Has Been Approved!</h3>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Welcome to Imperial Trading! Your account has been approved and you now have full access to our premium trading platform.
          </p>
          
          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #c09a58; margin-top: 0;">What's next:</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 10px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #c09a58;">✓</span>
                Access your trading dashboard
              </li>
              <li style="margin: 10px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #c09a58;">✓</span>
                Join live trading sessions
              </li>
              <li style="margin: 10px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #c09a58;">✓</span>
                Connect with our trading community
              </li>
              <li style="margin: 10px 0; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; color: #c09a58;">✓</span>
                Access premium trading tools and signals
              </li>
            </ul>
          </div>
          
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

  if (error) throw error

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function sendRejectionNotification(resend: any, { userEmail, userName, reason }: any) {
  const { data, error } = await resend.emails.send({
    from: 'Imperial Trading <support@tradeimperial.com>',
    to: [userEmail],
    subject: 'Imperial Trading - Account Request Update',
    html: `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #1f2937; margin-bottom: 20px; font-size: 24px;">Account Request Update</h1>
          
          <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
            Hello ${userName || 'there'},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your interest in joining Imperial Trading. After careful review, we're unable to approve your account request at this time.
          </p>
          
          <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
            <h3 style="color: #dc2626; margin-top: 0; margin-bottom: 10px;">Reason for rejection:</h3>
            <p style="color: #7f1d1d; margin: 0; font-size: 14px;">${reason}</p>
          </div>
          
          <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
            <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 10px;">📝 You can resubmit your application</h3>
            <p style="color: #0c4a6e; margin: 0; font-size: 14px;">
              Please address the feedback above and feel free to submit a new application. We encourage you to review our requirements and try again.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('SITE_URL') || 'https://tradeimperial.com'}/access-request" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              Submit New Application
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
            If you have any questions about this decision or need clarification on the requirements, please don't hesitate to contact our support team.
          </p>
        </div>
      </div>
    `,
  })

  if (error) throw error

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function sendDailyDigest(resend: any, supabase: any) {
  // Get pending requests count
  const { data: pendingRequests, count } = await supabase
    .from('account_requests')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')

  if (count === 0) {
    return new Response(JSON.stringify({ message: 'No pending requests for digest' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const adminEmails = ['admin@tradeimperial.com']

  const emailPromises = adminEmails.map(adminEmail => 
    resend.emails.send({
      from: 'Imperial Trading <digest@tradeimperial.com>',
      to: [adminEmail],
      subject: `📊 Daily Digest - ${count} Pending Account Request${count > 1 ? 's' : ''}`,
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
          <div style="background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #1f2937; margin-bottom: 20px; font-size: 24px;">Daily Admin Digest</h1>
            
            <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 6px; padding: 20px; margin-bottom: 20px; text-align: center;">
              <h2 style="color: #1e40af; margin: 0; font-size: 32px;">${count}</h2>
              <p style="color: #1e40af; margin: 5px 0 0 0; font-weight: 500;">Pending Account Request${count > 1 ? 's' : ''}</p>
            </div>
            
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
              Good morning! Here's your daily summary of account requests requiring attention.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('SITE_URL') || 'https://tradeimperial.com'}/dashboard/admin-panel" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                Review Pending Requests
              </a>
            </div>
            
            <div style="color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              <p style="margin: 0;">This digest is sent daily at 9:00 AM. You can modify your notification preferences in the admin panel.</p>
            </div>
          </div>
        </div>
      `,
    })
  )

  await Promise.all(emailPromises)

  return new Response(JSON.stringify({ success: true, message: 'Daily digest sent', count }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function sendTestNotification(resend: any) {
  const { data, error } = await resend.emails.send({
    from: 'Imperial Trading <test@tradeimperial.com>',
    to: ['admin@tradeimperial.com'],
    subject: '🧪 Test Notification - Imperial Trading Admin',
    html: `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #1f2937; margin-bottom: 20px; font-size: 24px;">🧪 Test Notification</h1>
          
          <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #047857; font-weight: 500;">
              ✅ Email notification system is working correctly!
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
            This is a test email sent from the Imperial Trading admin notification system. If you received this email, the notification system is functioning properly.
          </p>
          
          <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin-top: 0;">Test Details:</h3>
            <ul style="color: #6b7280; margin: 0;">
              <li>Sent at: ${new Date().toLocaleString()}</li>
              <li>Function: account-request-notifications</li>
              <li>Type: Test notification</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            This test was triggered from the admin panel notification settings.
          </p>
        </div>
      </div>
    `,
  })

  if (error) throw error

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
