
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Environment-based configuration for nuclear option rollout
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kmuoqkcxguafxulqlbmi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI";

// Runtime verification and guards
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase configuration. Please check environment variables.');
}

console.log('🔗 Supabase Client Configuration:', {
  url: SUPABASE_URL,
  keyRef: SUPABASE_PUBLISHABLE_KEY.includes('lbmi') ? 'lbmi ✅' : 'lami ❌',
  source: import.meta.env.VITE_SUPABASE_URL ? 'env' : 'fallback'
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
