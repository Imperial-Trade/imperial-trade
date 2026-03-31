// Route-Gated Subscriptions Hook - Only subscribe to data needed for current route
// This prevents unnecessary realtime connections and reduces costs significantly

import { useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { isDevToolsEnabled } from '@/utils/featureFlags';

// Define which routes need which subscriptions
const ROUTE_SUBSCRIPTION_MAP: Record<string, string[]> = {
  // Dashboard index redirects to signal-stream; keep subscriptions for brief /dashboard hit
  '/dashboard': ['signals', 'prices'],
  
  // Signals page - needs full signals data
  '/dashboard/signals': ['signals', 'prices'],
  
  // Signal stream - needs full signals and prices data  
  '/dashboard/signal-stream': ['signals', 'prices'],
  
  // Create alert - needs prices only
  '/dashboard/create-alert': ['prices'],
  
  // New signal creation - needs prices only
  '/dashboard/new-signal': ['prices'],
  
  // Administration pages - need signals and prices
  '/dashboard/admin': ['signals', 'prices'],
  '/dashboard/admin/*': ['signals', 'prices'],
  '/dashboard/administration': ['signals', 'prices'],
  
  // Academy - no realtime needed
  '/dashboard/academy': [],
  '/dashboard/academy/*': [],
  
  // Advanced tools - needs prices for calculators, but NOT signals
  '/dashboard/advanced-tools': ['prices'],
  
  // Profile pages - no realtime needed
  '/dashboard/profile': [],
  '/dashboard/settings': [],
  
  // Live sessions - needs session data
  '/dashboard/live-sessions': ['live_sessions'],
  
  // Journal - no realtime needed (unless shared)
  '/dashboard/journal': [],
  
  // Forum - needs forum data
  '/dashboard/forum': ['forum'],
  '/dashboard/forum/*': ['forum'],
  
  // Default fallback for unknown routes
  '*': []
};

export interface RouteSubscriptionConfig {
  allowedSubscriptions: string[];
  isSubscriptionAllowed: (subscriptionType: string) => boolean;
  currentRoute: string;
}

export function useRouteGatedSubscriptions(): RouteSubscriptionConfig {
  const location = useLocation();
  const currentRoute = location.pathname;
  const previousRouteRef = useRef<string>('');

  // Get allowed subscriptions for current route
  const getAllowedSubscriptions = (route: string): string[] => {
    // Try exact match first
    if (ROUTE_SUBSCRIPTION_MAP[route]) {
      return ROUTE_SUBSCRIPTION_MAP[route];
    }
    
    // Try pattern matching for wildcard routes
    for (const [pattern, subscriptions] of Object.entries(ROUTE_SUBSCRIPTION_MAP)) {
      if (pattern.includes('*')) {
        const basePattern = pattern.replace('/*', '');
        if (route.startsWith(basePattern)) {
          return subscriptions;
        }
      }
    }
    
    // Return default/fallback
    return ROUTE_SUBSCRIPTION_MAP['*'] || [];
  };

  const allowedSubscriptions = getAllowedSubscriptions(currentRoute);

  const isSubscriptionAllowed = (subscriptionType: string): boolean => {
    return allowedSubscriptions.includes(subscriptionType);
  };

  // Log route changes and subscription changes for debugging
  useEffect(() => {
    if (previousRouteRef.current !== currentRoute) {
      const previousAllowed = getAllowedSubscriptions(previousRouteRef.current);
      const currentAllowed = allowedSubscriptions;
      
      const added = currentAllowed.filter(sub => !previousAllowed.includes(sub));
      const removed = previousAllowed.filter(sub => !currentAllowed.includes(sub));
      
      if (isDevToolsEnabled()) {
        console.log('🚦 Route-gated subscriptions changed:', {
          route: currentRoute,
          allowed: currentAllowed,
          added,
          removed
        });
      }
      
      previousRouteRef.current = currentRoute;
    }
  }, [currentRoute, allowedSubscriptions]);

  return {
    allowedSubscriptions,
    isSubscriptionAllowed,
    currentRoute
  };
}

// Helper hook for components to check if they should establish realtime connections
export function useRealtimeGate(subscriptionType: string): boolean {
  const { isSubscriptionAllowed } = useRouteGatedSubscriptions();
  
  const allowed = isSubscriptionAllowed(subscriptionType);
  
  useEffect(() => {
    if (isDevToolsEnabled() && !allowed) {
      console.log(`🚦 Realtime connection blocked for "${subscriptionType}" on current route`);
    }
  }, [subscriptionType, allowed]);
  
  return allowed;
}