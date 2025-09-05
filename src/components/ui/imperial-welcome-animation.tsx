import React, { useState, useLayoutEffect, useRef } from 'react';
import { TypewriterText } from './typewriter-text';
import { useAuth } from '@/contexts/AuthContext';

interface ImperialWelcomeAnimationProps {
  onComplete?: () => void;
}

export const ImperialWelcomeAnimation: React.FC<ImperialWelcomeAnimationProps> = ({ onComplete }) => {
  const { user } = useAuth();
  // Timer/interval refs for deterministic behavior (avoid rAF throttling)
  const dotIntervalRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const removeTimeoutRef = useRef<number | null>(null);
  const safetyTimeoutRef = useRef<number | null>(null);
  const completedOnceRef = useRef(false);
  const dotCountRef = useRef(0);

  const [isVisible, setIsVisible] = useState(true);
  const [activeDot, setActiveDot] = useState(0);
  const [typingComplete, setTypingComplete] = useState(false);
  const [showDashboardFade, setShowDashboardFade] = useState(false);
  const [fadeStarted, setFadeStarted] = useState(false);
  const typingCompleteRef = useRef(false);
  const tagline = "the imperial experience awaits.";
  
  console.info('[Welcome v2-gold] Component mounted');
  
  // Get user name with fallback logic
  const getUserName = () => {
    if (!user) return "Trader";
    const metadata = user.user_metadata || {};
    return metadata.full_name || 
           metadata.display_name || 
           (user.email ? user.email.split('@')[0] : "Trader");
  };

  // Begin the dashboard fade and schedule overlay removal (runs once)
  const startFade = (reason: 'timer' | 'dots' | 'safety') => {
    if (completedOnceRef.current) return;
    completedOnceRef.current = true;
    console.info(`[Welcome v2-gold] Starting dashboard fade (${reason})`);
    setShowDashboardFade(true);
    setFadeStarted(true);
    // Allow dashboard to initialize underneath
    onComplete?.();
    // Remove overlay after the full 5s fade
    removeTimeoutRef.current = window.setTimeout(() => {
      console.info('[Welcome v2-gold] Overlay removed');
      setIsVisible(false);
    }, 5000);
  };
  const handleTypingComplete = () => {
    typingCompleteRef.current = true;
    setTypingComplete(true);
    console.info('[Welcome v2-gold] Typing complete, starting dots');
    
    // Start deterministic dot animation with dot counting
    let dot = 0;
    dotCountRef.current = 0;
    setActiveDot(0);
    
    dotIntervalRef.current = window.setInterval(() => {
      dot = (dot + 1) % 3;
      dotCountRef.current++;
      setActiveDot(dot);
      
      // Trigger fade after 9 dot transitions (~3 cycles)
      if (dotCountRef.current >= 9) {
        startFade('dots');
      }
    }, 333);
    
    // Also trigger by timer as backup (6s from mount)
    fadeTimeoutRef.current = window.setTimeout(() => startFade('timer'), 6000);
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
    // Safety fallback: force-complete if animation is throttled
    safetyTimeoutRef.current = window.setTimeout(() => {
      if (!completedOnceRef.current) {
        console.warn('[Welcome v2-gold] Safety timeout triggered');
        startFade('safety');
      }
    }, 10000);

    return () => {
      isCleanedUp = true;
      removeEventListeners();
      
      if (dotIntervalRef.current) {
        clearInterval(dotIntervalRef.current);
        dotIntervalRef.current = null;
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      if (removeTimeoutRef.current) {
        clearTimeout(removeTimeoutRef.current);
        removeTimeoutRef.current = null;
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
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
      className={`fixed inset-0 z-[2147483646] flex items-center justify-center overscroll-none touch-none transition-all duration-[5000ms] ${
        showDashboardFade ? 'bg-black/0' : 'bg-black'
      } ${fadeStarted ? 'pointer-events-none' : ''}`}
      style={{ minHeight: '100dvh' }}
      data-version="v2-gold"
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
    >
      <div className="text-center px-4 max-w-4xl mx-auto">
        <>
          <h1 className="text-white/90 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-wide mb-8 sm:mb-10 leading-tight">
            <TypewriterText 
              text={tagline}
              speed={100}
              onComplete={handleTypingComplete}
              className="text-white/90"
            />
          </h1>
          
          {typingComplete && (
            <div className="flex items-center justify-center gap-2 sm:gap-3 animate-fade-in">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-opacity duration-300 ${
                    activeDot === index ? 'bg-white opacity-100' : 'bg-white/30 opacity-60'
                  }`}
                />
              ))}
            </div>
          )}
        </>
      </div>
    </div>
  );
};