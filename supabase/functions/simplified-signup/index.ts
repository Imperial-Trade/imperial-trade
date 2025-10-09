import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { full_name, email, phone_number, password, terms_accepted } = await req.json();

    // Validate input
    if (!full_name || !email || !password || !terms_accepted) {
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
      console.error('Error creating account request:', insertError);
      throw insertError;
    }

    console.log('Account request created successfully:', accountRequest.id);

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
