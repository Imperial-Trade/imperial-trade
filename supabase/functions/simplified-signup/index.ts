import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Health check endpoint
  if (req.method === 'GET') {
    console.log('🏥 Health check requested');
    return new Response(
      JSON.stringify({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        function: 'simplified-signup',
        version: '1.0.0'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { full_name, email, phone_number, password, terms_accepted } = await req.json();

    // Log incoming request (with PII sanitization)
    console.log('📥 Received signup request:', { 
      email_prefix: email?.substring(0, 3) + '***',
      has_password: !!password,
      has_phone: !!phone_number,
      timestamp: new Date().toISOString()
    });

    // Validate input
    if (!full_name || !email || !password || !terms_accepted) {
      console.error('❌ Validation failed: Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if account request already exists
    const { data: existingRequest, error: checkError } = await supabase
      .from('account_requests')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing request:', checkError);
      throw checkError;
    }

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return new Response(
          JSON.stringify({ error: 'An account request with this email is already pending review' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (existingRequest.status === 'approved') {
        return new Response(
          JSON.stringify({ error: 'This email is already registered. Please sign in instead.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    console.log('🔐 Password hash created successfully');

    // Create account request with password hash and phone number
    const { data: accountRequest, error: insertError } = await supabase
      .from('account_requests')
      .insert({
        full_name,
        email: email.toLowerCase(),
        phone_number: phone_number || null,
        password_hash,
        terms_accepted,
        terms_accepted_at: new Date().toISOString(),
        account_type: 'user',
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating account request:', insertError);
      throw insertError;
    }

    console.log('✅ Account request inserted successfully:', { 
      id: accountRequest.id,
      email_prefix: accountRequest.email?.substring(0, 3) + '***',
      has_password_hash: !!accountRequest.password_hash,
      has_phone: !!accountRequest.phone_number
    });

    // TODO: Send confirmation email to user
    // TODO: Send notification to admins

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account request submitted successfully. An admin will review your request shortly.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in simplified-signup function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
