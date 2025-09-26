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
  // 🚨 PHASE 2: Session stability - use stable session ID based on tab
  const sessionIdRef = useRef<string>('');
  
  // Initialize session ID only once
  if (!sessionIdRef.current) {
    // Check if session already exists in sessionStorage
    let sessionId = sessionStorage.getItem('ui_session_id');
    if (!sessionId) {
      sessionId = `ui-${Date.now()}-${Math.random().toString(36).slice(-6)}`;
      sessionStorage.setItem('ui_session_id', sessionId);
    }
    sessionIdRef.current = sessionId;
  }
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRegistrationRef = useRef(0);

  useEffect(() => {
    // Register initial activity
    const registerActivity = async () => {
      const now = Date.now();
      
      // 🚨 PHASE 2: Reduced registration frequency to prevent spam
      if (now - lastRegistrationRef.current < 60000) { // Increased to 60 seconds
        return;
      }

      try {
        // CRITICAL FIX: Always provide a user_id, use a default if not authenticated
        const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // Default for anonymous users
        
        const { error } = await supabase.rpc('register_ui_activity', {
          p_session_id: sessionIdRef.current,
          p_user_id: userId,
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

    // 🚨 PHASE 2: Increased to 5 minutes to reduce message frequency
    intervalRef.current = setInterval(registerActivity, 300000); // 5 minutes

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
    if (now - lastRegistrationRef.current < 30000) { // Rate limit to 30 seconds
      return;
    }

    try {
      // CRITICAL FIX: Always provide a user_id, use a default if not authenticated
      const userId = user?.id || '00000000-0000-0000-0000-000000000000'; // Default for anonymous users
      
      const { error } = await supabase.rpc('register_ui_activity', {
        p_session_id: sessionIdRef.current,
        p_user_id: userId,
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