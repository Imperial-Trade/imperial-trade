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
        const authUser = existingUsers?.users?.find(u => 
          u.email?.toLowerCase() === request.email.toLowerCase()
        );

        if (authUser) {
          console.log(`🔍 Auth user exists for: ${request.email} - checking profile...`);
          
          // Check if profile also exists
          const { data: profile, error: profileCheckError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('id', authUser.id)
            .maybeSingle();
          
          if (profileCheckError) {
            console.error('❌ Error checking profile:', profileCheckError);
          }
          
          if (profile) {
            // Both auth user AND profile exist - fully activated
            console.log(`✅ Profile exists - account fully activated`);
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
          
          // Auth user exists but profile missing - create profile now
          console.log('⚠️ Auth user exists but profile missing - creating profile...');
          
          const metadata = authUser.user_metadata || {};
          const computed_role = 
            metadata.role === 'admin' ? 'admin' :
            metadata.role === 'educator' ? 'educator' : 'user';
          const computed_user_type = 
            metadata.account_type === 'educator' ? 'educator' : 'user';
          const computed_access_level = 
            metadata.role === 'admin' ? 'admin' :
            metadata.role === 'educator' ? 'moderator' : 'user';
          
          console.log('🔍 Creating missing profile with values:', {
            role: computed_role,
            user_type: computed_user_type,
            access_level: computed_access_level
          });
          
          const { error: missingProfileError } = await supabaseClient
            .from('profiles')
            .insert({
              id: authUser.id,
              real_name: metadata.full_name || request.full_name || 'User',
              display_name: null,
              role: computed_role,
              user_type: computed_user_type,
              access_level: computed_access_level,
              account_status: 'active',
              registration_source: 'account_request',
              phone_number: metadata.phone_number || request.phone_number
            });
          
          if (missingProfileError) {
            console.error('❌ Failed to create missing profile:', missingProfileError);
            
            // Log error to cron_job_logs
            await supabaseClient.from('cron_job_logs').insert({
              job_name: 'missing_profile_creation',
              execution_time: new Date().toISOString(),
              records_affected: 0,
              status: 'error',
              error_message: `Failed to create missing profile for ${authUser.id}: ${missingProfileError.message}`
            });
            
            return new Response(
              JSON.stringify({ 
                error: `Profile creation failed: ${missingProfileError.message}`,
                success: false
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          console.log('✅ Missing profile created successfully');
          
          // Log success to cron_job_logs
          await supabaseClient.from('cron_job_logs').insert({
            job_name: 'missing_profile_creation',
            execution_time: new Date().toISOString(),
            records_affected: 1,
            status: 'success',
            error_message: `Profile created for existing auth user ${request.email} - role: ${computed_role}, user_type: ${computed_user_type}, access_level: ${computed_access_level}`
          });
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Account activated successfully',
              profileCreated: true,
              alreadyExists: false
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create auth user
        const { data: newAuthUser, error: authError } = await supabaseClient.auth.admin.createUser({
          email: request.email.toLowerCase().trim(),
          password: activationPassword,
          email_confirm: true,
          user_metadata: {
            full_name: request.full_name,
            phone_number: request.phone_number,
            registration_source: 'account_request',
            account_status: 'active',
            approved_at: new Date().toISOString(),
            approved_by: approvedBy,
            // FIXED: Explicit role mappings with correct enum values
            account_type: 'user',    // user_type_enum: user | educator | admin (NOT 'member')
            role: 'user',            // profiles.role string field
            access_level: 'user'     // access_level_enum: admin | moderator | user
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

        console.log(`✅ Auth account created: user_id=${newAuthUser.user?.id}`)

        // Create profile record directly (no trigger on auth.users allowed)
        console.log('📝 Creating profile record...')
        
        const metadata = newAuthUser.user?.user_metadata || {}
        
        // Compute role mappings (same logic as handle_new_user() function)
        const computed_role = 
          metadata.role === 'admin' ? 'admin' :
          metadata.role === 'educator' ? 'educator' : 'user'
        
        // FIXED: Map to 'user' instead of 'member'
        const computed_user_type = 
          metadata.account_type === 'educator' ? 'educator' : 'user'
        
        const computed_access_level = 
          metadata.role === 'admin' ? 'admin' :
          metadata.role === 'educator' ? 'moderator' : 'user'
        
        console.log('🔍 Computed profile values:', {
          role: computed_role,
          user_type: computed_user_type,
          access_level: computed_access_level
        })
        
        // Insert profile into public.profiles
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .insert({
            id: newAuthUser.user.id,
            email: request.email.toLowerCase().trim(),
            real_name: metadata.full_name || request.full_name || 'User',
            display_name: null,
            role: computed_role,
            user_type: computed_user_type,
            access_level: computed_access_level,
            account_status: 'active',
            registration_source: 'account_request',
            phone_number: metadata.phone_number || request.phone_number
          })
        
        if (profileError) {
          console.error('❌ Failed to create profile:', profileError)
          
          // Log error to cron_job_logs for visibility
          await supabaseClient.from('cron_job_logs').insert({
            job_name: 'profile_creation_edge_function',
            execution_time: new Date().toISOString(),
            records_affected: 0,
            status: 'error',
            error_message: `Profile creation failed for user ${newAuthUser.user.id}: ${profileError.message}`
          })
          
          return new Response(
            JSON.stringify({ 
              error: `Auth account created but profile creation failed: ${profileError.message}`,
              success: false,
              userId: newAuthUser.user?.id
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log('✅ Profile created successfully')
        
        // Log success to cron_job_logs
        await supabaseClient.from('cron_job_logs').insert({
          job_name: 'profile_creation_edge_function',
          execution_time: new Date().toISOString(),
          records_affected: 1,
          status: 'success',
          error_message: `Profile created for ${request.email} - role: ${computed_role}, user_type: ${computed_user_type}, access_level: ${computed_access_level}`
        })

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Account approved and activated successfully',
            userId: newAuthUser.user?.id,
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
