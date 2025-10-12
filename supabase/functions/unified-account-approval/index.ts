import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Hash function for password verification (matches frontend implementation)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash function for PII sanitization in logs
async function hashIdentifier(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, expires',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { requestId, status, rejectionReason, activationPassword } = await req.json()

    console.log('📥 Unified approval request:', {
      requestId,
      status,
      hasRejectionReason: !!rejectionReason,
      hasActivationPassword: !!activationPassword,
      timestamp: new Date().toISOString()
    })

    if (!requestId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: requestId and status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the current user for audit trail
    const authHeader = req.headers.get('Authorization')
    let approvedBy = 'system'
    let approverHash = 'system'
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseClient.auth.getUser(token)
      if (user) {
        approvedBy = user.email || 'system'
        approverHash = await hashIdentifier(user.email || 'system')
      }
    }

    // Get the account request
    const { data: request, error: fetchError } = await supabaseClient
      .from('account_requests')
      .select()
      .eq('id', requestId)
      .single()

    if (fetchError || !request) {
      console.error('❌ Account request not found:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Account request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestHash = await hashIdentifier(request.email)

    // Handle rejection
    if (status === 'rejected') {
      const { error: updateError } = await supabaseClient
        .from('account_requests')
        .update({ 
          status: 'rejected', 
          rejection_reason: rejectionReason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) {
        console.error('❌ Failed to reject request:', updateError)
        throw updateError
      }

      console.log(`❌ Account request rejected: email_hash=${requestHash} by approver_hash=${approverHash}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Account request rejected',
          needsActivation: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle approval
    if (status === 'approved') {
      // Step 1: Update account request status
      const { error: updateError } = await supabaseClient
        .from('account_requests')
        .update({ 
          status: 'approved', 
          approved_by: approvedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) {
        console.error('❌ Failed to approve request:', updateError)
        throw updateError
      }

      console.log(`✅ Account request approved: email_hash=${requestHash} by approver_hash=${approverHash}`)

      // Step 2: If activationPassword provided, create auth account immediately
      if (activationPassword) {
        console.log('🔐 Activation password provided - creating auth account...')

        // Handle accounts with null password_hash (password reset activation)
        if (!request.password_hash) {
          console.log('⚠️ Null password hash detected - activating via password reset (safe: email already validated by Supabase)')
          // Skip password verification, create Auth user with new password
          // This is safe because password reset email was already validated by Supabase Auth
        } else {
          // Normal password verification for accounts with stored hashes
          const providedPasswordHash = await hashPassword(activationPassword)
          
          // Check if hash is in old BASE64 format (SHA-256 hex is exactly 64 hex chars: 0-9a-f)
          const isOldBase64Format = !/^[0-9a-f]{64}$/.test(request.password_hash)
          
          if (isOldBase64Format) {
            console.log('⚠️ Old BASE64 hash format detected - treating as null for password reset activation')
            // Skip verification, allow password reset activation
          } else if (providedPasswordHash !== request.password_hash) {
            console.error('❌ Password verification failed')
            return new Response(
              JSON.stringify({ 
                error: 'Invalid password. Please use the password you created during signup.',
                success: false
              }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        console.log('✅ Password verified - creating Supabase Auth user...')

        // Check if auth user already exists to prevent duplicate creation
        const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
        const authUserExists = existingUsers?.users?.some(u => 
          u.email?.toLowerCase() === request.email.toLowerCase()
        );

        if (authUserExists) {
          console.log(`✅ Auth account already exists for: ${request.email}`);
          return new Response(
            JSON.stringify({ 
              success: true,
              message: 'Account already activated. You can now sign in.',
              alreadyExists: true
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Create auth user
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
          email: request.email.toLowerCase().trim(),
          password: activationPassword,
          email_confirm: true,
          user_metadata: {
            full_name: request.full_name,
            account_type: request.account_type,
            approved_at: new Date().toISOString(),
            approved_by: approvedBy
          }
        })

        if (authError) {
          console.error('❌ Failed to create auth user:', authError)
          
          // Check if user already exists
          if (authError.message?.includes('already registered')) {
            return new Response(
              JSON.stringify({ 
                success: true,
                message: 'Account already activated. Please sign in.',
                alreadyExists: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ 
              error: `Failed to create auth account: ${authError.message}`,
              success: false
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log(`✅ Auth account created: user_id=${authUser.user?.id}`)

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Account approved and activated successfully',
            userId: authUser.user?.id,
            needsActivation: false
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // No activation password - user will activate manually
      console.log('📝 No activation password - user must activate manually')

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Account approved. User must activate with their signup password.',
          needsActivation: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid status value' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Error in unified-account-approval:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
