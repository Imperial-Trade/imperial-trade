import React, { useState, useLayoutEffect, useRef } from 'react';
import { TypewriterText } from './typewriter-text';

interface ImperialWelcomeAnimationProps {
  onComplete?: () => void;
}

export const ImperialWelcomeAnimation: React.FC<ImperialWelcomeAnimationProps> = ({ onComplete }) => {
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const [isVisible, setIsVisible] = useState(true);
  const [activeDot, setActiveDot] = useState(0);
  const [typingComplete, setTypingComplete] = useState(false);

  const tagline = "the imperial experience awaits.";

  const animate = (currentTime: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = currentTime;
    }
    
    const elapsedTime = currentTime - startTimeRef.current;
    
    // Only animate dots after typing is complete
    if (typingComplete) {
      // Update active dot every 600ms
      const cycleTime = elapsedTime % 1800; // 3 dots * 600ms
      const newActiveDot = Math.floor(cycleTime / 600);
      setActiveDot(newActiveDot);
      
      // Show for 2 seconds after typing completes
      if (elapsedTime >= 2000) {
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 100);
        return;
      }
    }
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const handleTypingComplete = () => {
    setTypingComplete(true);
    // Reset the start time for dot animation
    startTimeRef.current = performance.now();
  };

  useLayoutEffect(() => {
    // Prevent StrictMode double-invocation issues
    let isCleanedUp = false;
    
    // Store original styles and scroll position
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    
    // Store original inline styles with kebab-case properties
    const originalStyles = {
      html: {
        'overflow': htmlEl.style.overflow,
        'overscroll-behavior': htmlEl.style.overscrollBehavior,
        'touch-action': htmlEl.style.touchAction,
        'height': htmlEl.style.height
      },
      body: {
        'overflow': bodyEl.style.overflow,
        'position': bodyEl.style.position,
        'top': bodyEl.style.top,
        'left': bodyEl.style.left,
        'right': bodyEl.style.right,
        'width': bodyEl.style.width,
        'height': bodyEl.style.height,
        'overscroll-behavior': bodyEl.style.overscrollBehavior,
        'touch-action': bodyEl.style.touchAction
      }
    };

    // Helper function to set CSS with !important
    const setImportant = (el: HTMLElement, prop: string, val: string) => {
      el.style.setProperty(prop, val, 'important');
    };

    // Apply comprehensive scroll lock to both html and body
    setImportant(htmlEl, 'overflow', 'hidden');
    setImportant(htmlEl, 'overscroll-behavior', 'none');
    setImportant(htmlEl, 'touch-action', 'none');
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
      if (!isCleanedUp) {
        window.scrollTo(0, scrollY);
      }
    };

    // Add event listeners to both window and document for maximum coverage
    const addEventListeners = () => {
      // Window events with capture and non-passive
      window.addEventListener('wheel', preventScroll, { passive: false, capture: true });
      window.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
      window.addEventListener('keydown', preventKeys, { passive: false, capture: true });
      window.addEventListener('scroll', lockScrollPos, { passive: true });
      
      // Document events for additional coverage
      document.addEventListener('wheel', preventScroll, { passive: false, capture: true });
      document.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
      document.addEventListener('keydown', preventKeys, { passive: false, capture: true });
    };

    const removeEventListeners = () => {
      // Remove window events
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('keydown', preventKeys);
      window.removeEventListener('scroll', lockScrollPos);
      
      // Remove document events
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('keydown', preventKeys);
    };

    addEventListeners();
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      isCleanedUp = true;
      removeEventListeners();
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // Restore original styles exactly using kebab-case
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

      // Restore scroll position after a brief delay to ensure DOM is ready
      setTimeout(() => {
        window.scrollTo(0, scrollY);
      }, 0);
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
      className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black overscroll-none touch-none"
      style={{ minHeight: '100dvh' }}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
    >
      <div className="text-center px-4 max-w-4xl mx-auto">
        <h1 className="text-white/90 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-wide mb-8 sm:mb-10 leading-tight">
          <TypewriterText 
            text={tagline}
            speed={100}
            onComplete={handleTypingComplete}
            className="text-white/90"
          />
        </h1>
        
        {typingComplete && (
          <div className="flex items-center justify-center gap-3 sm:gap-5 animate-fade-in">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-opacity duration-300 ${
                  activeDot === index ? 'bg-white opacity-100' : 'bg-white/30 opacity-60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};