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
  const lastRegistrationRef = useRef<number>(0);
  const isUnmountedRef = useRef<boolean>(false);
  const prevSymbolsRef = useRef<string[]>([]); // 🎯 PHASE 3: Track previous symbols for deep equality

  useEffect(() => {
    isUnmountedRef.current = false;
    
    // 🎯 PHASE 3: Deep equality check for symbols to prevent unnecessary re-runs
    const symbolsChanged = JSON.stringify(prevSymbolsRef.current) !== JSON.stringify(symbols);
    if (!symbolsChanged && prevSymbolsRef.current.length > 0) {
      // Symbols haven't changed, skip registration
      return;
    }
    prevSymbolsRef.current = symbols;
    
    const sessionId = (() => {
      try {
        const existing = sessionStorage.getItem('ui-session-id');
        if (existing) return existing;
        const newId = `ui-${Date.now()}-${Math.random().toString(36).substring(2)}`;
        sessionStorage.setItem('ui-session-id', newId);
        return newId;
      } catch {
        return `ui-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      }
    })();

    const registerActivity = async (): Promise<void> => {
      try {
        // Check if component is unmounted
        if (isUnmountedRef.current) return;
        
        // 🎯 PHASE 3: Rate limiting with 5-second debounce
        const now = Date.now();
        if (now - lastRegistrationRef.current < 5000) {
          return;
        }

        // BROADCAST FIX: Skip registration if user not authenticated yet
        // This prevents foreign key constraint failures during auth transitions
        if (!user?.id || user.id.length === 0) {
          return; // Silently skip - don't log to avoid spam
        }

        // 🔍 DIAGNOSTIC: Log symbols being sent to backend
        console.log('📡 UI Activity Registration - Sending symbols:', symbols);

        await supabase.rpc('register_ui_activity_enhanced', {
          p_session_id: sessionId,
          p_user_id: user.id,
          p_symbols: symbols.length > 0 ? symbols : []
        });

        lastRegistrationRef.current = now;
        
      } catch (error: any) {
        // BROADCAST FIX: Silently handle foreign key constraint errors during auth transitions
        if (error?.code === '23503') {
          return; // Silently skip - this is expected during auth timing
        }
        
        // Only log unexpected errors
        if (error?.code !== 'PGRST204') {
          console.error('UI Activity Registration failed:', {
            error: error?.message || 'Unknown error',
            code: error?.code,
            timestamp: new Date().toISOString()
          });
        }
      }
    };

    // 🎯 PHASE 7: INSTANT registration - no delay to prevent broadcast race condition
    // The existing 5-second debounce in registerActivity() (line 46-50) prevents spam
    if (!isUnmountedRef.current && user?.id) {
      registerActivity(); // Call immediately on mount
    }

    // Periodic registration every 30 seconds (aligns with backend's 60s activity threshold)
    const intervalId = setInterval(() => {
      if (!isUnmountedRef.current && user?.id) {
        registerActivity();
      }
    }, 30 * 1000);

    return () => {
      isUnmountedRef.current = true;
      clearInterval(intervalId);
    };
  }, [user?.id, symbols]);

  // Manual interaction registration function
  const registerInteraction = async (): Promise<void> => {
    try {
      // BROADCAST FIX: Skip if user not authenticated yet
      if (!user?.id || user.id.length === 0) {
        return; // Silently skip
      }
      
      // Rate limiting
      const now = Date.now();
      if (now - lastRegistrationRef.current < 5000) {
        return;
      }

      const sessionId = sessionStorage.getItem('ui-session-id') || `manual-${Date.now()}`;
      
      await supabase.rpc('register_ui_activity_enhanced', {
        p_session_id: sessionId,
        p_user_id: user.id,
        p_symbols: symbols.length > 0 ? symbols : []
      });

      lastRegistrationRef.current = now;
      
    } catch (error: any) {
      // BROADCAST FIX: Silently handle foreign key constraint errors
      if (error?.code === '23503' || error?.code === 'PGRST204') {
        return;
      }
      
      console.error('Manual interaction registration failed:', {
        error: error?.message || 'Unknown error',
        code: error?.code
      });
    }
  };

  return { registerInteraction };
}