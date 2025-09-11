
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
  }
});
