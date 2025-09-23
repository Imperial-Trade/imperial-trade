import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * UI Activity Registration Hook
 * 
 * Registers user activity to enable activity-based resource management.
 * This prevents the price ingestor from processing when no users are active,
 * reducing Realtime message costs by up to 95% during idle periods.
 */
export function useUIActivityRegistration(symbols: string[] = []) {
  const { user } = useAuth();
  const sessionIdRef = useRef(`ui-${Date.now()}-${Math.random().toString(36).slice(-6)}`);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRegistrationRef = useRef(0);

  useEffect(() => {
    // Register initial activity
    const registerActivity = async () => {
      const now = Date.now();
      
      // Rate limit registration calls to every 30 seconds
      if (now - lastRegistrationRef.current < 30000) {
        return;
      }

      try {
        const { error } = await supabase.rpc('register_ui_activity', {
          p_session_id: sessionIdRef.current,
          p_user_id: user?.id || null,
          p_symbols: symbols.filter(s => s && s.trim().length > 0)
        });
        
        if (error) {
          throw error;
        }
        
        lastRegistrationRef.current = now;
        console.log('🎯 UI activity registered for session:', sessionIdRef.current);
      } catch (error) {
        console.warn('⚠️ Failed to register UI activity:', error);
      }
    };

    // Register activity immediately
    registerActivity();

    // Set up periodic registration every 2 minutes to maintain activity status
    intervalRef.current = setInterval(registerActivity, 120000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id, symbols]);

  // Register activity on user interactions
  const registerInteraction = async () => {
    const now = Date.now();
    if (now - lastRegistrationRef.current < 10000) { // Rate limit to 10 seconds
      return;
    }

    try {
      const { error } = await supabase.rpc('register_ui_activity', {
        p_session_id: sessionIdRef.current,
        p_user_id: user?.id || null,
        p_symbols: symbols.filter(s => s && s.trim().length > 0)
      });
      
      if (error) {
        throw error;
      }

      lastRegistrationRef.current = now;
    } catch (error) {
      console.warn('⚠️ Failed to register interaction:', error);
    }
  };

  return { registerInteraction };
}