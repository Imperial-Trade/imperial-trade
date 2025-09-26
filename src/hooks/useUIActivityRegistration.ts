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
    // CRITICAL FIX: Skip registration for unauthenticated users to prevent foreign key failures
    if (!user?.id) {
      console.log('🚫 UI activity registration skipped - user not authenticated');
      return;
    }

    // Register initial activity
    const registerActivity = async () => {
      const now = Date.now();
      
      // 🚨 PHASE 2: Increased registration frequency to reduce message volume
      if (now - lastRegistrationRef.current < 120000) { // Increased to 120 seconds (2 minutes)
        return;
      }

      try {
        const { error } = await supabase.rpc('register_ui_activity_enhanced', {
          p_session_id: sessionIdRef.current,
          p_user_id: user.id, // Only authenticated users now
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

    // 🚨 PHASE 2: Increased to 10 minutes to drastically reduce message frequency
    intervalRef.current = setInterval(registerActivity, 600000); // 10 minutes

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id, symbols]);

  // Register activity on user interactions
  const registerInteraction = async () => {
    // CRITICAL FIX: Skip registration for unauthenticated users to prevent foreign key failures
    if (!user?.id) {
      console.log('🚫 UI interaction registration skipped - user not authenticated');
      return;
    }

    const now = Date.now();
    if (now - lastRegistrationRef.current < 60000) { // Rate limit increased to 60 seconds
      return;
    }

    try {
      const { error } = await supabase.rpc('register_ui_activity_enhanced', {
        p_session_id: sessionIdRef.current,
        p_user_id: user.id, // Only authenticated users now
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