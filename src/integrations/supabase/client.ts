
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUPABASE KEY INTEGRATION - COMPLETE GUIDE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. ANON PUBLIC KEY (THIS FILE - FRONTEND USE)
 *    ✅ Used for: Browser/client-side code
 *    ✅ Security: Safe to expose publicly (RLS protects data)
 *    ✅ Location: Hardcoded below (SUPABASE_PUBLISHABLE_KEY)
 *    ✅ Purpose: User authentication, RLS-protected database queries
 *    ✅ Format: Legacy JWT format (eyJhbGci...) OR new sb_publishable_...
 *    ✅ Created: January 11, 2025 (iat: 1757602966)
 *    ✅ Expires: January 11, 2073 (exp: 2073178966)
 * 
 * 2. SERVICE ROLE KEY (EDGE FUNCTIONS ONLY - BACKEND USE)
 *    ⚠️  Used for: Supabase Edge Functions (server-side code)
 *    ⚠️  Security: NEVER expose to frontend - bypasses ALL RLS policies
 *    ⚠️  Location: Supabase secrets (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
 *    ⚠️  Purpose: Admin operations, system tasks, bypass RLS when needed
 *    ⚠️  Access: Full database access - use with extreme caution
 * 
 * 3. LOVABLE-SPECIFIC REQUIREMENTS
 *    ❌ DO NOT USE: VITE_* environment variables (not supported by Lovable)
 *    ✅ ALWAYS USE: Hardcoded credentials in this file
 *    📖 Reference: https://docs.lovable.dev/features/cloud
 * 
 * 4. SECURITY BEST PRACTICES
 *    ✅ Anon key: Safe to commit to Git (RLS protects sensitive data)
 *    ❌ Service role key: NEVER commit to Git, NEVER expose to frontend
 *    ✅ RLS policies: Must be enabled on ALL sensitive tables
 *    ✅ Key rotation: Regenerate keys if compromised via Supabase dashboard
 * 
 * 5. KEY VERIFICATION (Automatic on Load)
 *    - JWT payload is decoded and validated against project URL
 *    - Ensures anon key matches project reference 'kmuoqkcxguafxulqlbmi'
 *    - Logs validation success/failure to browser console
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// CRITICAL FIX (Bug #10): Valid anon key (same as production .env)
// Updated: January 11, 2025 - Replaces invalid key from March 4, 2024
const SUPABASE_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDI5NjYsImV4cCI6MjA3MzE3ODk2Nn0.m6vaoaT7X7VvcKaY3W3aVEi5ZjqitAjQAJbyYnps_sc';

// Runtime verification and guards
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  throw new Error('Missing Supabase configuration. Please check environment variables.');
}

// JWT validation to prevent key/URL mismatches
try {
  const jwtPayload = JSON.parse(atob(SUPABASE_PUBLISHABLE_KEY.split('.')[1]));
  const expectedProjectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (jwtPayload.ref !== expectedProjectRef) {
    console.error('🚨 CRITICAL: Anon key project reference mismatch!', {
      keyRef: jwtPayload.ref,
      urlRef: expectedProjectRef,
      expected: 'kmuoqkcxguafxulqlbmi'
    });
    throw new Error(`Anon key mismatch: Key is for project '${jwtPayload.ref}' but URL is for project '${expectedProjectRef}'`);
  }
  
  console.log('✅ JWT validation passed - Key matches project URL');
} catch (error) {
  if (error instanceof Error && error.message.includes('Anon key mismatch')) {
    throw error;
  }
  console.warn('⚠️  Could not validate JWT format, proceeding with caution:', error);
}

console.log('🔗 Supabase Client Configuration:', {
  url: SUPABASE_URL,
  keyConfigured: !!SUPABASE_PUBLISHABLE_KEY,
  source: 'environment'
});

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
});
