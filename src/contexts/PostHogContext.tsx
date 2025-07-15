
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
        console.log('Initializing PostHog...');
        
        // Get PostHog configuration from edge function
        const { data, error } = await supabase.functions.invoke('posthog-config');
        
        if (error) {
          console.log('PostHog config error:', error);
          setIsEnabled(false);
          setIsLoaded(true);
          return;
        }

        if (!data?.enabled || !data?.apiKey) {
          console.log('PostHog not enabled or API key missing');
          setIsEnabled(false);
          setIsLoaded(true);
          return;
        }

        // Initialize PostHog with enhanced configuration
        posthog.init(data.apiKey, {
          api_host: data.apiHost || 'https://app.posthog.com',
          capture_pageview: false, // We'll handle this manually
          capture_pageleave: true,
          loaded: (posthog) => {
            console.log('PostHog loaded successfully');
            setIsLoaded(true);
            setIsEnabled(true);
            
            // Load feature flags
            posthog.onFeatureFlags(() => {
              // Get all feature flag keys and their values
              const flagsObject: Record<string, boolean | string> = {};
              
              // Since we can't get all flags at once, we'll track them as they're accessed
              setFeatureFlags(flagsObject);
              console.log('Feature flags loaded:', flagsObject);
            });
          },
          // Privacy settings
          respect_dnt: true,
          opt_out_capturing_by_default: false,
          // Performance settings
          request_batching: true,
          // Enhanced settings for funnels and feature flags
          bootstrap: {
            featureFlags: {},
          },
          // Enable advanced features
          enable_recording_console_log: true,
          secure_cookie: true,
        });

      } catch (error) {
        console.error('PostHog initialization error:', error);
        setIsEnabled(false);
        setIsLoaded(true);
      }
    };

    initializePostHog();
  }, []);

  const track = (event: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      // Add feature flag context to all events
      const enhancedProperties = {
        ...properties,
        feature_flags: featureFlags,
        timestamp: new Date().toISOString(),
      };
      
      posthog.capture(event, enhancedProperties);
    } catch (error) {
      console.error('PostHog tracking error:', error);
    }
  };

  const identify = (userId: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      posthog.identify(userId, properties);
      // Reload feature flags after identification
      posthog.reloadFeatureFlags();
    } catch (error) {
      console.error('PostHog identify error:', error);
    }
  };

  const reset = () => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      posthog.reset();
      setFeatureFlags({});
    } catch (error) {
      console.error('PostHog reset error:', error);
    }
  };

  const getFeatureFlag = (flag: string): boolean | string | undefined => {
    if (!isEnabled || !isLoaded) return undefined;
    
    try {
      return posthog.getFeatureFlag(flag);
    } catch (error) {
      console.error('PostHog getFeatureFlag error:', error);
      return undefined;
    }
  };

  const onFeatureFlags = (callback: (flags: Record<string, boolean | string>) => void) => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      posthog.onFeatureFlags(() => {
        // We'll update flags as they're accessed through getFeatureFlag
        const updatedFlags = { ...featureFlags };
        setFeatureFlags(updatedFlags);
        callback(updatedFlags);
      });
    } catch (error) {
      console.error('PostHog onFeatureFlags error:', error);
    }
  };

  const reloadFeatureFlags = () => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      posthog.reloadFeatureFlags();
    } catch (error) {
      console.error('PostHog reloadFeatureFlags error:', error);
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
