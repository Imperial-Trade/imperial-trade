
import React, { useCallback, useRef } from 'react';
import { usePostHog } from '@/contexts/PostHogContext';
import { useEventDeduplication } from '@/hooks/useOptimizedDebounce';

interface OptimizedClickTrackerProps {
  children: React.ReactNode;
  trackingId?: string;
  trackingData?: Record<string, any>;
}

// Optimized click tracking with throttling and deduplication
export function OptimizedClickTracker({ children, trackingId, trackingData = {} }: OptimizedClickTrackerProps) {
  const { trackClick, isEnabled } = usePostHog();
  const clickTimeRef = useRef<number>(0);
  const { isDuplicate } = useEventDeduplication();

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    
    const now = Date.now();
    const timeSinceLastClick = now - clickTimeRef.current;
    
    // Prevent rapid-fire clicking (increased from 100ms to 500ms)
    if (timeSinceLastClick < 500) return;
    
    clickTimeRef.current = now;
    
    const target = event.currentTarget as HTMLElement;
    const clickEventKey = `click_${trackingId || target.className}_${target.textContent?.slice(0, 20)}`;
    
    // Check for duplicate clicks
    if (isDuplicate(clickEventKey)) return;
    
    // Minimal element info for performance
    const elementInfo = {
      element_id: trackingId || target.id || 'unknown',
      element_text: target.textContent?.slice(0, 30) || '', // Reduced from 100 to 30
      ...trackingData,
    };
    
    trackClick(trackingId || 'element_click_optimized', elementInfo);
  }, [trackClick, trackingId, trackingData, isEnabled, isDuplicate]);

  return (
    <div onClick={handleClick} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}

// Optimized button wrapper with smart throttling
export function OptimizedTrackedButton({ 
  children, 
  onClick, 
  trackingId, 
  trackingData = {},
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  trackingId?: string;
  trackingData?: Record<string, any>;
}) {
  const { trackClick, isEnabled } = usePostHog();
  const lastClickRef = useRef<number>(0);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const now = Date.now();
    
    // Throttle button clicks to once per second
    if (now - lastClickRef.current < 1000) {
      if (onClick) onClick(event);
      return;
    }
    
    lastClickRef.current = now;

    if (isEnabled && trackingId) {
      trackClick(`button_${trackingId}_optimized`, {
        button_text: typeof children === 'string' ? children.slice(0, 20) : 'button',
        button_type: props.type || 'button',
        ...trackingData,
      });
    }
    
    if (onClick) {
      onClick(event);
    }
  }, [onClick, trackClick, trackingId, trackingData, children, props.type, isEnabled]);

  return (
    <button {...props} onClick={handleClick}>
      {children}
    </button>
  );
}
