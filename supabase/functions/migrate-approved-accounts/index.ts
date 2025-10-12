import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Starting migration of approved accounts without auth users...');

    // Get all approved account requests
    const { data: approvedRequests, error: fetchError } = await supabaseAdmin
      .from('account_requests')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching approved requests:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${approvedRequests?.length || 0} approved requests`);

    let processed = 0;
    let created = 0;
    let skipped = 0;
    let failed = 0;
    const results = [];

    // Process each approved request
    for (const request of approvedRequests || []) {
      processed++;
      
      try {
        // Check if auth user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === request.email.toLowerCase());

        if (userExists) {
          console.log(`⏭️  Skipping ${request.email} - auth account already exists`);
          skipped++;
          results.push({
            email: request.email,
            status: 'skipped',
            reason: 'Auth account already exists'
          });
          continue;
        }

        // Call unified-account-approval edge function
        console.log(`🔧 Creating auth account for: ${request.email}`);
        
        const createAccountUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/unified-account-approval`;
        const createResponse = await fetch(createAccountUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId: request.id,
            status: 'approved',
            activationPassword: null  // No password = user activates manually
          }),
        });

        const createResult = await createResponse.json();

        if (!createResponse.ok) {
          console.error(`❌ Failed to create account for ${request.email}:`, createResult);
          failed++;
          results.push({
            email: request.email,
            status: 'failed',
            error: createResult.error || 'Unknown error'
          });
        } else {
          console.log(`✅ Successfully created auth account for: ${request.email}`);
          created++;
          results.push({
            email: request.email,
            status: 'created',
            message: 'Auth account created, password setup email sent'
          });
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`❌ Error processing ${request.email}:`, error);
        failed++;
        results.push({
          email: request.email,
          status: 'error',
          error: error.message
        });
      }
    }

    const summary = {
      total_approved_requests: approvedRequests?.length || 0,
      processed,
      created,
      skipped,
      failed,
      results
    };

    console.log('✅ Migration complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
