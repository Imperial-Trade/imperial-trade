import React, { useState, useLayoutEffect, useRef } from 'react';
import { TypewriterText } from './typewriter-text';
import { useAuth } from '@/contexts/AuthContext';

interface ImperialWelcomeAnimationProps {
  onComplete?: () => void;
}

export const ImperialWelcomeAnimation: React.FC<ImperialWelcomeAnimationProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const dotCycleCountRef = useRef(0);
  const [isVisible, setIsVisible] = useState(true);
  const [activeDot, setActiveDot] = useState(0);
  const [typingComplete, setTypingComplete] = useState(false);
  const [fadeToBlack, setFadeToBlack] = useState(false);
  const [doorwayFade, setDoorwayFade] = useState(false);
  const [showDashboardFade, setShowDashboardFade] = useState(false);
  const typingCompleteRef = useRef(false);

  const tagline = "the imperial experience awaits.";
  
  // Get user name with fallback logic
  const getUserName = () => {
    if (!user) return "Trader";
    const metadata = user.user_metadata || {};
    return metadata.full_name || 
           metadata.display_name || 
           (user.email ? user.email.split('@')[0] : "Trader");
  };

  const animate = (currentTime: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = currentTime;
    }
    
    const elapsedTime = currentTime - startTimeRef.current;
    
    // Only animate dots after typing is complete
    if (typingCompleteRef.current && !fadeToBlack && !doorwayFade && !showDashboardFade) {
      // 3 cycles in 3 seconds = 1000ms per cycle
      const cycleTime = elapsedTime % 1000;
      const newActiveDot = Math.floor(cycleTime / 250); // 1000ms / 4 dots
      setActiveDot(newActiveDot);
      
      // Count complete cycles
      const currentCycle = Math.floor(elapsedTime / 1000);
      if (currentCycle > dotCycleCountRef.current) {
        dotCycleCountRef.current = currentCycle;
      }
      
      // After exactly 3 cycles (3 seconds), start fade to black
      if (currentCycle >= 3 && elapsedTime >= 3000) {
        setFadeToBlack(true);
        
        // After 0.5s fade to black, start doorway fade
        setTimeout(() => {
          setDoorwayFade(true);
          
          // After 2s simple fade, call onComplete and remove overlay
          setTimeout(() => {
            onComplete?.();
            setIsVisible(false);
          }, 2000); // 2 second elegant fade duration
        }, 500); // 0.5 second fade to black duration
        return;
      }
    }
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const handleTypingComplete = () => {
    typingCompleteRef.current = true;
    setTypingComplete(true);
    // Reset the start time for dot animation
    startTimeRef.current = performance.now();
  };

  useLayoutEffect(() => {
    // Store original scroll position for restoration
    const originalScrollY = window.scrollY;
    
    // Lightweight scroll prevention using CSS classes only
    document.body.classList.add('overflow-hidden', 'fixed', 'inset-0');
    document.documentElement.classList.add('overflow-hidden');
    
    // Minimal event prevention - only essential ones
    const handleWheel = (e: WheelEvent) => e.preventDefault();
    const handleTouchMove = (e: TouchEvent) => e.preventDefault();
    
    // Use passive: false only where needed
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      // Cleanup animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Cleanup - remove classes and listeners
      document.body.classList.remove('overflow-hidden', 'fixed', 'inset-0');
      document.documentElement.classList.remove('overflow-hidden');
      
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchmove', handleTouchMove);
      
      // Restore scroll position
      requestAnimationFrame(() => window.scrollTo(0, originalScrollY));
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[2147483646] flex items-center justify-center overscroll-none touch-none transition-all ${
        fadeToBlack ? 'bg-black duration-500' : 
        doorwayFade ? 'bg-black animate-fade-out' : 
        'bg-black'
      }`}
    >
      {/* Simple elegant fade - no complex effects */}

      <div className={`text-center px-4 max-w-4xl mx-auto transition-opacity duration-500 ${
        fadeToBlack ? 'opacity-0' : 'opacity-100'
      }`}>
        {!doorwayFade && (
          <>
            <h1 className="text-white/90 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-wide mb-8 sm:mb-10 leading-tight">
              <TypewriterText 
                text={tagline}
                speed={100}
                onComplete={handleTypingComplete}
                className="text-white/90"
              />
            </h1>
            
            {typingComplete && !fadeToBlack && (
              <div className="flex items-center justify-center gap-2 sm:gap-3 animate-fade-in">
                {[0, 1, 2, 3].map((index) => (
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
        )}
      </div>
    </div>
  );
};