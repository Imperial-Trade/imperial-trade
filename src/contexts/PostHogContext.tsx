
import React, { createContext, useContext, useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { supabase } from '@/integrations/supabase/client';

interface PostHogContextType {
  isLoaded: boolean;
  track: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: Record<string, any>) => void;
  reset: () => void;
  isEnabled: boolean;
  getFeatureFlag: (flag: string) => boolean | string | undefined;
  onFeatureFlags: (callback: (flags: Record<string, boolean | string>) => void) => void;
  reloadFeatureFlags: () => void;
}

const PostHogContext = createContext<PostHogContextType | undefined>(undefined);

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean | string>>({});

  useEffect(() => {
    const initializePostHog = async () => {
      try {
        console.log('🚀 Initializing PostHog...');
        
        // Get PostHog configuration from edge function
        const { data, error } = await supabase.functions.invoke('posthog-config');
        
        if (error) {
          console.error('❌ PostHog config error:', error);
          setIsEnabled(false);
          setIsLoaded(true);
          return;
        }

        if (!data?.enabled || !data?.apiKey) {
          console.warn('⚠️ PostHog not enabled or API key missing');
          setIsEnabled(false);
          setIsLoaded(true);
          return;
        }

        console.log('✅ PostHog config loaded:', { enabled: data.enabled, hasApiKey: !!data.apiKey });

        // Initialize PostHog with simplified configuration
        posthog.init(data.apiKey, {
          api_host: data.apiHost || 'https://app.posthog.com',
          capture_pageview: true, // Enable automatic page view tracking
          capture_pageleave: true,
          loaded: (posthog) => {
            console.log('🎯 PostHog loaded successfully');
            setIsLoaded(true);
            setIsEnabled(true);
            
            // Send a test event to verify PostHog is working
            posthog.capture('posthog_initialized', {
              timestamp: new Date().toISOString(),
              user_agent: navigator.userAgent,
              url: window.location.href,
            });
            
            // Load feature flags
            posthog.onFeatureFlags(() => {
              console.log('🏁 Feature flags callback triggered');
              // We'll update flags as they're accessed
              setFeatureFlags({});
            });
          },
          // Privacy and performance settings
          respect_dnt: true,
          opt_out_capturing_by_default: false,
          request_batching: true,
          secure_cookie: true,
          // Simplified feature flag configuration
          bootstrap: {
            featureFlags: {},
          },
        });

      } catch (error) {
        console.error('💥 PostHog initialization error:', error);
        setIsEnabled(false);
        setIsLoaded(true);
      }
    };

    initializePostHog();
  }, []);

  const track = (event: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) {
      console.log('📵 PostHog not enabled/loaded, skipping track:', event);
      return;
    }
    
    try {
      console.log('📊 Tracking event:', event, properties);
      
      const enhancedProperties = {
        ...properties,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        path: window.location.pathname,
      };
      
      posthog.capture(event, enhancedProperties);
    } catch (error) {
      console.error('❌ PostHog tracking error:', error);
    }
  };

  const identify = (userId: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) {
      console.log('📵 PostHog not enabled/loaded, skipping identify:', userId);
      return;
    }
    
    try {
      console.log('👤 Identifying user:', userId, properties);
      posthog.identify(userId, {
        ...properties,
        identified_at: new Date().toISOString(),
      });
      
      // Reload feature flags after identification
      posthog.reloadFeatureFlags();
    } catch (error) {
      console.error('❌ PostHog identify error:', error);
    }
  };

  const reset = () => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      console.log('🔄 Resetting PostHog');
      posthog.reset();
      setFeatureFlags({});
    } catch (error) {
      console.error('❌ PostHog reset error:', error);
    }
  };

  const getFeatureFlag = (flag: string): boolean | string | undefined => {
    if (!isEnabled || !isLoaded) return undefined;
    
    try {
      const flagValue = posthog.getFeatureFlag(flag);
      console.log('🏁 Feature flag accessed:', flag, '=', flagValue);
      return flagValue;
    } catch (error) {
      console.error('❌ PostHog getFeatureFlag error:', error);
      return undefined;
    }
  };

  const onFeatureFlags = (callback: (flags: Record<string, boolean | string>) => void) => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      posthog.onFeatureFlags(() => {
        const updatedFlags = { ...featureFlags };
        setFeatureFlags(updatedFlags);
        callback(updatedFlags);
      });
    } catch (error) {
      console.error('❌ PostHog onFeatureFlags error:', error);
    }
  };

  const reloadFeatureFlags = () => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      console.log('🔄 Reloading feature flags');
      posthog.reloadFeatureFlags();
    } catch (error) {
      console.error('❌ PostHog reloadFeatureFlags error:', error);
    }
  };

  return (
    <PostHogContext.Provider value={{ 
      isLoaded, 
      track, 
      identify, 
      reset, 
      isEnabled,
      getFeatureFlag,
      onFeatureFlags,
      reloadFeatureFlags,
    }}>
      {children}
    </PostHogContext.Provider>
  );
}

export function usePostHog() {
  const context = useContext(PostHogContext);
  if (context === undefined) {
    throw new Error('usePostHog must be used within a PostHogProvider');
  }
  return context;
}
