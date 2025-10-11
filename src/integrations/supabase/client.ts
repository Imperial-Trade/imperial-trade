
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// CRITICAL FIX: Hardcoded credentials (VITE_* variables are not supported in Lovable)
// See: https://docs.lovable.dev/features/cloud - "DO NOT EVER USE VARIABLES LIKE VITE_*"
const SUPABASE_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI';

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
