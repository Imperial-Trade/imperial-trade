import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Global RealtimeShutdownGuard - Eliminates zombie connections on page unload
 * 
 * This component should be mounted once at the App level to ensure all
 * Supabase Realtime channels are properly cleaned up when the user:
 * - Closes the tab/window
 * - Navigates away from the application
 * - Refreshes the page
 * 
 * This is a critical safety net to prevent connection leaks.
 */
export const RealtimeShutdownGuard: React.FC = () => {
  useEffect(() => {
    const handlePageHide = () => {
      console.log('🚨 RealtimeShutdownGuard: Page hiding, cleaning up all channels');
      
      try {
        // Get all active channels and remove them
        const channels = supabase.getChannels();
        channels.forEach((channel) => {
          console.log('🧹 RealtimeShutdownGuard: Removing channel:', channel.topic);
          
          // If we end up using presence in the future, untrack safely
          try {
            if ((channel as any).presence && typeof (channel as any).untrack === 'function') {
              (channel as any).untrack();
            }
          } catch (error) {
            // Ignore presence untrack errors
            console.warn('RealtimeShutdownGuard: Presence untrack failed:', error);
          }
          
          supabase.removeChannel(channel);
        });
        
        console.log(`🧹 RealtimeShutdownGuard: Cleaned up ${channels.length} channels`);
      } catch (error) {
        console.error('RealtimeShutdownGuard: Cleanup error:', error);
      }
    };

    const handleBeforeUnload = () => {
      console.log('🚨 RealtimeShutdownGuard: Before unload, cleaning up all channels');
      handlePageHide();
    };

    // Listen for both pagehide and beforeunload for maximum coverage
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // This component renders nothing - it's purely for side effects
  return null;
};