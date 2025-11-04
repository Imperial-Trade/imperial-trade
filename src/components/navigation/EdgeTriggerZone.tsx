import React from 'react';

interface EdgeTriggerZoneProps {
  onTrigger: () => void;
  isVisible: boolean;
  edgeWidth?: number;
  showIndicator?: boolean;
}

export function EdgeTriggerZone({ 
  onTrigger, 
  isVisible, 
  edgeWidth = 50,
  showIndicator = true 
}: EdgeTriggerZoneProps) {
  // Don't render if sidebar is already open
  if (isVisible) return null;

  const handleTrigger = (e: React.TouchEvent | React.MouseEvent) => {
    console.log('🎯 Edge zone triggered:', {
      type: e.type,
      clientX: 'clientX' in e ? e.clientX : (e as React.TouchEvent).touches[0]?.clientX
    });
    
    onTrigger();
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  };

  return (
    <div
      className="fixed left-0 top-0 bottom-0 z-[100]"
      style={{
        width: `${edgeWidth}px`,
        pointerEvents: 'auto',
        touchAction: 'none',
        background: showIndicator 
          ? 'linear-gradient(to right, rgba(59, 130, 246, 0.1), transparent)'
          : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.2s ease'
      }}
      onClick={handleTrigger}
      onTouchStart={handleTrigger}
      onMouseEnter={handleTrigger}
      aria-hidden="true"
      role="button"
      aria-label="Open sidebar"
    />
  );
}
