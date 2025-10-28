import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import imperialLogo from '@/assets/imperial-logo.png';

interface ModernImperialWelcomeProps {
  onComplete?: () => void;
}

type AnimationPhase = 
  | 'centerAppear'    // 0.0-0.2s
  | 'centerHold'      // 0.2-0.5s
  | 'centerFadeOut'   // 0.5-0.7s
  | 'spinReveal'      // 0.7-1.0s
  | 'textReveal'      // 1.0-1.3s
  | 'settle'          // 1.3-2.0s
  | 'fadeOverlay';    // 2.0-2.5s

export const ModernImperialWelcome: React.FC<ModernImperialWelcomeProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<AnimationPhase>('centerAppear');
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    // Update mobile state on resize
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Skip animation if user prefers reduced motion
    if (prefersReducedMotion) {
      onComplete?.();
      return;
    }

    // Prevent body scroll during animation
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Animation timeline
    const centerHoldTimer = setTimeout(() => setPhase('centerHold'), 200);
    const fadeOutTimer = setTimeout(() => setPhase('centerFadeOut'), 500);
    const spinTimer = setTimeout(() => setPhase('spinReveal'), 700);
    const textTimer = setTimeout(() => setPhase('textReveal'), 1000);
    const settleTimer = setTimeout(() => setPhase('settle'), 1300);
    const fadeTimer = setTimeout(() => setPhase('fadeOverlay'), 2000);
    const completeTimer = setTimeout(() => {
      document.body.style.overflow = originalOverflow;
      onComplete?.();
    }, 2500); // Trigger dashboard load at 2.5s

    // ESC key to skip animation
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.style.overflow = originalOverflow;
        onComplete?.();
      }
    };
    window.addEventListener('keydown', handleEscape);

    // Cleanup
    return () => {
      clearTimeout(centerHoldTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(spinTimer);
      clearTimeout(textTimer);
      clearTimeout(settleTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [onComplete, prefersReducedMotion]);

  // Skip render if reduced motion
  if (prefersReducedMotion) {
    return null;
  }

  // Centered combo positioning (logo on left, text on right)
  const centeredComboPosition = {
    logo: {
      x: isMobile ? -70 : -90,
      y: 0,
      scale: isMobile ? 0.35 : 0.4
    },
    text: {
      x: isMobile ? 60 : 80,
      y: 0
    }
  };

  // Logo animation variants
  const logoVariants = {
    centerAppear: {
      scale: 0,
      opacity: 0,
      x: 0,
      y: 0,
      rotateY: 0,
      filter: 'drop-shadow(0 0 0px rgba(255, 215, 0, 0))',
      transition: { duration: 0.2, ease: [0.42, 0, 0.58, 1] as const }
    },
    centerHold: {
      scale: 1.0,
      opacity: 1,
      x: 0,
      y: 0,
      rotateY: 0,
      filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.5))',
      transition: { 
        duration: 0.3,
        ease: [0.42, 0, 0.58, 1] as const
      }
    },
    centerFadeOut: {
      scale: 1.0,
      opacity: 0,
      x: 0,
      y: 0,
      rotateY: 0,
      filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.5))',
      transition: { 
        duration: 0.2,
        ease: [0.42, 0, 0.58, 1] as const
      }
    },
    spinReveal: {
      scale: centeredComboPosition.logo.scale,
      x: centeredComboPosition.logo.x,
      y: centeredComboPosition.logo.y,
      rotateY: 360,
      opacity: 1,
      filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.4))',
      transition: { 
        duration: 0.3, 
        ease: [0.4, 0, 0.6, 1] as const
      }
    },
    textReveal: {
      scale: centeredComboPosition.logo.scale,
      x: centeredComboPosition.logo.x,
      y: centeredComboPosition.logo.y,
      rotateY: 360,
      opacity: 1,
      filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.4))'
    },
    settle: {
      scale: centeredComboPosition.logo.scale,
      x: centeredComboPosition.logo.x,
      y: centeredComboPosition.logo.y,
      rotateY: 360,
      opacity: 1,
      filter: 'drop-shadow(0 0 25px rgba(255, 215, 0, 0.3))',
      transition: { 
        duration: 0.7,
        ease: [0.42, 0, 0.58, 1] as const
      }
    },
    fadeOverlay: {
      scale: centeredComboPosition.logo.scale,
      x: centeredComboPosition.logo.x,
      y: centeredComboPosition.logo.y,
      rotateY: 360,
      opacity: 1,
      filter: 'drop-shadow(0 0 25px rgba(255, 215, 0, 0.3))'
    }
  };

  // Text animation variants
  const textContainerVariants = {
    centerAppear: { opacity: 0, x: centeredComboPosition.text.x, y: centeredComboPosition.text.y },
    centerHold: { opacity: 0, x: centeredComboPosition.text.x, y: centeredComboPosition.text.y },
    centerFadeOut: { opacity: 0, x: centeredComboPosition.text.x, y: centeredComboPosition.text.y },
    spinReveal: { opacity: 0, x: centeredComboPosition.text.x, y: centeredComboPosition.text.y },
    textReveal: {
      opacity: 1,
      x: centeredComboPosition.text.x,
      y: centeredComboPosition.text.y,
      transition: {
        duration: 0.3,
        ease: [0.42, 0, 1, 1] as const,
        staggerChildren: 0.03,
        delayChildren: 0
      }
    },
    settle: { opacity: 1, x: centeredComboPosition.text.x, y: centeredComboPosition.text.y },
    fadeOverlay: { opacity: 1, x: centeredComboPosition.text.x, y: centeredComboPosition.text.y }
  };

  const letterVariants = {
    centerAppear: { opacity: 0, y: 10 },
    centerHold: { opacity: 0, y: 10 },
    centerFadeOut: { opacity: 0, y: 10 },
    spinReveal: { opacity: 0, y: 10 },
    textReveal: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, ease: [0.4, 0, 0.6, 1] as const }
    },
    settle: { opacity: 1, y: 0 },
    fadeOverlay: { opacity: 1, y: 0 }
  };

  // Container fade animation
  const containerVariants = {
    centerAppear: { opacity: 1 },
    centerHold: { opacity: 1 },
    centerFadeOut: { opacity: 1 },
    spinReveal: { opacity: 1 },
    textReveal: { opacity: 1 },
    settle: { opacity: 1 },
    fadeOverlay: { 
      opacity: 0,
      transition: { 
        duration: 0.5,
        ease: [0.4, 0, 0.6, 1] as const
      }
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      variants={containerVariants}
      initial="centerAppear"
      animate={phase}
      style={{
        willChange: 'opacity',
        pointerEvents: phase === 'fadeOverlay' ? 'none' : 'auto'
      }}
    >
      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Loading Imperial Trading Platform
      </div>

      {/* Animated Logo */}
      <motion.img
        src={imperialLogo}
        alt="Imperial Trading Logo"
        className="w-32 h-32 md:w-40 md:h-40"
        variants={logoVariants}
        initial="centerAppear"
        animate={phase}
        style={{
          willChange: 'transform, opacity, filter',
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d'
        }}
      />

      {/* "TRADE IMPERIAL" Text - Appears after spin */}
      <motion.div
        className="absolute flex imperial-tech-font text-xl md:text-2xl"
        variants={textContainerVariants}
        initial="centerAppear"
        animate={phase}
        style={{
          willChange: 'transform, opacity'
        }}
      >
        {"TRADE IMPERIAL".split('').map((char, i) => (
          <motion.span
            key={i}
            variants={letterVariants}
            className="inline-block"
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </motion.div>

      {/* Golden glow effect background */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        animate={{
          opacity: phase === 'centerHold' ? 0.3 : (phase === 'centerAppear' || phase === 'centerFadeOut') ? 0.2 : 0.15
        }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%)',
            filter: 'blur(40px)'
          }}
        />
      </motion.div>
    </motion.div>
  );
};
