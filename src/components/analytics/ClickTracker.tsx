
import React, { useCallback, useRef } from 'react';
import { usePostHog } from '@/contexts/PostHogContext';

interface ClickTrackerProps {
  children: React.ReactNode;
  trackingId?: string;
  trackingData?: Record<string, any>;
}

// HOC component to automatically track clicks on any element
export function ClickTracker({ children, trackingId, trackingData = {} }: ClickTrackerProps) {
  const { trackClick, isEnabled } = usePostHog();
  const clickTimeRef = useRef<number>(0);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!isEnabled) return;
    
    const now = Date.now();
    const timeSinceLastClick = now - clickTimeRef.current;
    
    // Prevent rapid-fire clicking spam
    if (timeSinceLastClick < 100) return;
    
    clickTimeRef.current = now;
    
    const target = event.currentTarget as HTMLElement;
    const elementInfo = {
      element_tag: target.tagName.toLowerCase(),
      element_class: target.className,
      element_id: target.id || trackingId,
      element_text: target.textContent?.slice(0, 100) || '',
      click_position: { x: event.clientX, y: event.clientY },
      element_position: {
        x: target.offsetLeft,
        y: target.offsetTop,
        width: target.offsetWidth,
        height: target.offsetHeight,
      },
      ...trackingData,
    };
    
    trackClick(trackingId || 'element_click', elementInfo);
  }, [trackClick, trackingId, trackingData, isEnabled]);

  return (
    <div onClick={handleClick} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}

// Enhanced Button wrapper with automatic click tracking
export function TrackedButton({ 
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

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (isEnabled && trackingId) {
      trackClick(`button_${trackingId}`, {
        button_text: typeof children === 'string' ? children : 'button',
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
