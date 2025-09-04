import React, { useState, useEffect, useRef } from 'react';

interface ImperialWelcomeAnimationProps {
  onComplete?: () => void;
}

export const ImperialWelcomeAnimation: React.FC<ImperialWelcomeAnimationProps> = ({ onComplete }) => {
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const [isVisible, setIsVisible] = useState(true);
  const [activeDot, setActiveDot] = useState(0);

  const tagline = "the imperial experience awaits.";

  const animate = (currentTime: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = currentTime;
    }
    
    const elapsedTime = currentTime - startTimeRef.current;
    
    // Update active dot every 600ms
    const cycleTime = elapsedTime % 2400; // 4 dots * 600ms
    const newActiveDot = Math.floor(cycleTime / 600);
    setActiveDot(newActiveDot);
    
    // Show for 3 seconds then complete
    if (elapsedTime >= 3000) {
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 100);
      return;
    }
    
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    // Store original styles and scroll position
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    
    // Store original inline styles
    const originalStyles = {
      html: {
        overscrollBehavior: htmlEl.style.overscrollBehavior,
        height: htmlEl.style.height
      },
      body: {
        overflow: bodyEl.style.overflow,
        position: bodyEl.style.position,
        top: bodyEl.style.top,
        left: bodyEl.style.left,
        right: bodyEl.style.right,
        width: bodyEl.style.width,
        height: bodyEl.style.height,
        overscrollBehavior: bodyEl.style.overscrollBehavior,
        touchAction: bodyEl.style.touchAction
      }
    };

    // Helper function to set CSS with !important
    const setImportant = (el: HTMLElement, prop: string, val: string) => {
      el.style.setProperty(prop, val, 'important');
    };

    // Apply scroll lock with !important
    setImportant(htmlEl, 'overscroll-behavior', 'none');
    setImportant(htmlEl, 'height', '100%');
    setImportant(bodyEl, 'overflow', 'hidden');
    setImportant(bodyEl, 'position', 'fixed');
    setImportant(bodyEl, 'top', `-${scrollY}px`);
    setImportant(bodyEl, 'left', '0');
    setImportant(bodyEl, 'right', '0');
    setImportant(bodyEl, 'width', '100%');
    setImportant(bodyEl, 'height', '100%');
    setImportant(bodyEl, 'overscroll-behavior', 'none');
    setImportant(bodyEl, 'touch-action', 'none');

    // Event handlers to prevent scrolling
    const preventScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const preventKeys = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.code)) {
        preventScroll(e as unknown as Event);
      }
    };

    const lockScrollPos = () => {
      window.scrollTo(0, scrollY);
    };

    // Add event listeners with capture for maximum effectiveness
    window.addEventListener('wheel', preventScroll, { passive: false, capture: true });
    window.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
    window.addEventListener('keydown', preventKeys, { passive: false, capture: true });
    window.addEventListener('scroll', lockScrollPos, { passive: true });
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      // Remove event listeners
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('keydown', preventKeys);
      window.removeEventListener('scroll', lockScrollPos);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // Restore original styles exactly
      Object.entries(originalStyles.html).forEach(([prop, value]) => {
        if (value) {
          htmlEl.style.setProperty(prop, value);
        } else {
          htmlEl.style.removeProperty(prop);
        }
      });

      Object.entries(originalStyles.body).forEach(([prop, value]) => {
        if (value) {
          bodyEl.style.setProperty(prop, value);
        } else {
          bodyEl.style.removeProperty(prop);
        }
      });

      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, []);

  if (!isVisible) return null;

  // Additional event handlers for the overlay
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 z-[2147483646] flex flex-col items-center justify-center bg-black overscroll-none touch-none"
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
    >
      <div className="text-center">
        <h1 className="text-white/90 text-4xl md:text-6xl font-light tracking-wide mb-10">
          {tagline}
        </h1>
        
        <div className="flex items-center justify-center gap-5">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-opacity duration-300 ${
                activeDot === index ? 'bg-white opacity-100' : 'bg-white/30 opacity-60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};