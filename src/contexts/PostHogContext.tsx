
import React, { createContext, useContext, useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { supabase } from '@/integrations/supabase/client';

interface PostHogContextType {
  isLoaded: boolean;
  track: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: Record<string, any>) => void;
  reset: () => void;
  isEnabled: boolean;
}

const PostHogContext = createContext<PostHogContextType | undefined>(undefined);

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

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

        // Initialize PostHog
        posthog.init(data.apiKey, {
          api_host: data.apiHost || 'https://app.posthog.com',
          capture_pageview: false, // We'll handle this manually
          capture_pageleave: true,
          loaded: () => {
            console.log('PostHog loaded successfully');
            setIsLoaded(true);
            setIsEnabled(true);
          },
          // Privacy settings
          respect_dnt: true,
          opt_out_capturing_by_default: false,
          // Performance settings
          batch_requests: true,
          request_batching: true,
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
      posthog.capture(event, properties);
    } catch (error) {
      console.error('PostHog tracking error:', error);
    }
  };

  const identify = (userId: string, properties?: Record<string, any>) => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      posthog.identify(userId, properties);
    } catch (error) {
      console.error('PostHog identify error:', error);
    }
  };

  const reset = () => {
    if (!isEnabled || !isLoaded) return;
    
    try {
      posthog.reset();
    } catch (error) {
      console.error('PostHog reset error:', error);
    }
  };

  return (
    <PostHogContext.Provider value={{ 
      isLoaded, 
      track, 
      identify, 
      reset, 
      isEnabled 
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
