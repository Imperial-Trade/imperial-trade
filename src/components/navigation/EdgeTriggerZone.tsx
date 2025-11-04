import React from 'react';

interface EdgeTriggerZoneProps {
  onTrigger: () => void;
  isVisible: boolean;
  edgeWidth?: number;
}

export function EdgeTriggerZone({ onTrigger, isVisible, edgeWidth = 50 }: EdgeTriggerZoneProps) {
  // Don't render if sidebar is already open
  if (isVisible) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    onTrigger();
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  };

  return (
    <div
      className="fixed left-0 top-0 bottom-0 z-[61]"
      style={{
        width: `${edgeWidth}px`,
        pointerEvents: 'auto',
        touchAction: 'none'
      }}
      onTouchStart={handleTouchStart}
      aria-hidden="true"
    />
  );
}
