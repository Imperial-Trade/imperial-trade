
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    console.log('Checking admin access for user:', user.id)

    // Enhanced admin check with fallback logic
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('access_level, role, user_type')
      .eq('id', user.id)
      .single()

    let isAdmin = false
    
    if (profile) {
      console.log('Profile found:', profile)
      isAdmin = profile.access_level === 'admin' || profile.role === 'admin'
    } else {
      console.log('Profile not found, checking user metadata')
      // Fallback to user metadata if profile doesn't exist
      const userRole = user.user_metadata?.role || user.user_metadata?.access_level
      isAdmin = userRole === 'admin'
      
      // Create missing profile for admin user
      if (isAdmin) {
        console.log('Creating missing admin profile')
        await supabaseClient
          .from('profiles')
          .upsert({
            id: user.id,
            display_name: user.user_metadata?.full_name || user.email || 'Admin User',
            role: 'admin',
            access_level: 'admin',
            user_type: 'admin',
            account_status: 'active',
            registration_source: 'direct'
          })
      }
    }

    if (!isAdmin) {
      throw new Error('Insufficient permissions - admin access required')
    }

    const { action, userId, userData } = await req.json()

    switch (action) {
      case 'listUsers':
        // Get all auth users
        const { data: authUsers, error: authUsersError } = await supabaseClient.auth.admin.listUsers()
        if (authUsersError) throw authUsersError

        // Get all profiles
        const { data: profiles, error: profilesError } = await supabaseClient
          .from('profiles')
          .select('*')

        if (profilesError) throw profilesError

        // Combine auth data with profile data
        const combinedUsers = authUsers.users.map(authUser => {
          const profile = profiles?.find(p => p.id === authUser.id)
          return {
            id: authUser.id,
            email: authUser.email || '',
            display_name: profile?.display_name || authUser.user_metadata?.full_name || 'Unknown',
            role: profile?.role || 'user',
            user_type: profile?.user_type || 'member',
            access_level: profile?.access_level || 'user',
            account_status: profile?.account_status || 'active',
            registration_source: profile?.registration_source || 'direct',
            phone_number: profile?.phone_number || authUser.user_metadata?.phone_number,
            last_login: profile?.last_login || authUser.last_sign_in_at,
            created_at: authUser.created_at,
            email_confirmed_at: authUser.email_confirmed_at,
            approved_at: profile?.approved_at,
            approved_by: profile?.approved_by
          }
        })

        return new Response(JSON.stringify({ users: combinedUsers }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      case 'updateUser':
        // Update user profile
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .upsert({
            id: userId,
            ...userData,
            updated_at: new Date().toISOString()
          })

        if (updateError) throw updateError

        // Update auth metadata if role changes
        if (userData.role || userData.access_level) {
          const { error: authUpdateError } = await supabaseClient.auth.admin.updateUserById(userId, {
            user_metadata: { 
              role: userData.role || userData.access_level,
              access_level: userData.access_level 
            }
          })
          if (authUpdateError) console.warn('Auth metadata update failed:', authUpdateError)
        }

        // Log admin action
        await supabaseClient.from('audit_logs').insert({
          action: 'update_user',
          admin_email: user.email,
          target_entity: 'user',
          target_id: userId,
          details: { updated_fields: userData }
        })

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      case 'deleteUser':
        // Delete user from auth
        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId)
        if (deleteError) throw deleteError

        // Log admin action
        await supabaseClient.from('audit_logs').insert({
          action: 'delete_user',
          admin_email: user.email,
          target_entity: 'user',
          target_id: userId,
          details: { deleted_user_email: userData.email }
        })

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      case 'createUser':
        // Create new user
        const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.display_name,
            role: userData.role,
            access_level: userData.access_level,
            registration_source: 'admin_created'
          }
        })

        if (createError) throw createError

        // Log admin action
        await supabaseClient.from('audit_logs').insert({
          action: 'create_user',
          admin_email: user.email,
          target_entity: 'user',
          target_id: newUser.user.id,
          details: { created_user_email: userData.email, role: userData.role }
        })

        return new Response(JSON.stringify({ success: true, user: newUser.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      case 'resetPassword':
        // Send password reset email
        const { error: resetError } = await supabaseClient.auth.admin.generateLink({
          type: 'recovery',
          email: userData.email
        })

        if (resetError) throw resetError

        // Log admin action
        await supabaseClient.from('audit_logs').insert({
          action: 'reset_password',
          admin_email: user.email,
          target_entity: 'user',
          target_id: userId,
          details: { target_email: userData.email }
        })

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
