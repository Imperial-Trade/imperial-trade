
import { supabase } from '@/integrations/supabase/client';

export async function recordDeprecationHit(
  functionName: string, 
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('Cannot record deprecation hit - no authenticated user');
      return;
    }

    await supabase.from('function_deprecation_hits').insert({
      user_id: user.id,
      function_name: functionName,
      source: 'client',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href
      }
    });

    console.warn(`DEPRECATED FUNCTION USED: ${functionName}`, metadata);
  } catch (error) {
    console.error('Failed to record deprecation hit:', error);
    // Don't throw - telemetry failures shouldn't break app functionality
  }
}
