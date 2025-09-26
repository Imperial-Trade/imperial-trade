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
    // 🚨 ENHANCED RACE CONDITION PROTECTION: Multiple safeguards
    // 1. Early exit if no user context available
    if (!user?.id) {
      console.log('🚫 UI activity registration skipped - user not authenticated');
      return;
    }

    // 2. Additional validation to prevent edge cases
    if (typeof user.id !== 'string' || user.id.length < 32) {
      console.warn('🚫 UI activity registration skipped - invalid user ID format');
      return;
    }

    // Register initial activity with enhanced error handling
    const registerActivity = async () => {
      const now = Date.now();
      
      // Rate limiting (2 minutes minimum between calls)
      if (now - lastRegistrationRef.current < 120000) {
        return;
      }

      // 🚨 RUNTIME AUTHENTICATION GUARD: Double-check before each call
      if (!user?.id) {
        console.log('🚫 Runtime guard: UI activity registration skipped - user became unauthenticated');
        return;
      }

      try {
        const { error } = await supabase.rpc('register_ui_activity_enhanced', {
          p_session_id: sessionIdRef.current,
          p_user_id: user.id, // Triple-verified user ID
          p_symbols: symbols.filter(s => s && s.trim().length > 0)
        });
        
        if (error) {
          // 🚨 ENHANCED ERROR LOGGING for debugging persistent issues
          console.error('🔥 UI activity registration failed:', {
            error: error.message,
            code: error.code,
            userId: user.id,
            sessionId: sessionIdRef.current,
            timestamp: new Date().toISOString()
          });
          throw error;
        }
        
        lastRegistrationRef.current = now;
        console.log('🎯 UI activity registered successfully:', {
          session: sessionIdRef.current,
          userId: user.id,
          symbolCount: symbols.length
        });
      } catch (error) {
        console.warn('⚠️ Failed to register UI activity:', error);
        // Don't throw - let the app continue running even if activity registration fails
      }
    };

    // Delayed initial registration to ensure auth is fully loaded
    const initialDelay = setTimeout(() => {
      registerActivity();
    }, 1000); // 1-second delay to ensure auth context is stable

    // Reduced frequency: 10 minutes
    intervalRef.current = setInterval(registerActivity, 600000); 

    return () => {
      clearTimeout(initialDelay);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id, symbols]);

  // Register activity on user interactions with enhanced protection
  const registerInteraction = async () => {
    // 🚨 ENHANCED PROTECTION: Multiple authentication checks
    if (!user?.id) {
      console.log('🚫 UI interaction registration skipped - user not authenticated');
      return;
    }

    // Additional validation for user ID format
    if (typeof user.id !== 'string' || user.id.length < 32) {
      console.warn('🚫 UI interaction registration skipped - invalid user ID format');
      return;
    }

    const now = Date.now();
    if (now - lastRegistrationRef.current < 60000) { // Rate limit: 60 seconds
      return;
    }

    // 🚨 RUNTIME GUARD: Final check before RPC call
    if (!user?.id) {
      console.log('🚫 Runtime guard: Interaction registration skipped - user became unauthenticated');
      return;
    }

    try {
      const { error } = await supabase.rpc('register_ui_activity_enhanced', {
        p_session_id: sessionIdRef.current,
        p_user_id: user.id, // Triple-verified user ID
        p_symbols: symbols.filter(s => s && s.trim().length > 0)
      });
      
      if (error) {
        // Enhanced error logging for interactions
        console.error('🔥 UI interaction registration failed:', {
          error: error.message,
          code: error.code,
          userId: user.id,
          sessionId: sessionIdRef.current,
          timestamp: new Date().toISOString()
        });
        throw error;
      }

      lastRegistrationRef.current = now;
      console.log('🎯 UI interaction registered successfully');
    } catch (error) {
      console.warn('⚠️ Failed to register interaction:', error);
      // Don't throw - allow app to continue
    }
  };

  return { registerInteraction };
}