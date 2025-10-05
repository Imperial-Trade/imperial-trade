
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Environment-based configuration for nuclear option rollout
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
