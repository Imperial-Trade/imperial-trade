import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import imperialLogo from '@/assets/imperial-logo.png';

interface ModernImperialWelcomeProps {
  onComplete?: () => void;
}

type AnimationPhase = 
  | 'logoSpin'      // 0.0-1.2s: Logo spins 360°
  | 'textReveal'    // 0.5-1.2s: Text reveals L→R
  | 'wipeRight'     // 1.7-2.5s: Logo slides right
  | 'fadeOut';      // 2.5s: Complete

export const ModernImperialWelcome: React.FC<ModernImperialWelcomeProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<AnimationPhase>('logoSpin');
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      onComplete?.();
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => setPhase('textReveal'), 500));
    timers.push(setTimeout(() => setPhase('wipeRight'), 1700));
    timers.push(setTimeout(() => {
      setPhase('fadeOut');
      document.body.style.overflow = originalOverflow;
      onComplete?.();
    }, 2500));

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      document.body.style.overflow = originalOverflow;
    };
  }, [onComplete, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return null;
  }

  const logoVariants = {
    logoSpin: {
      x: 0,
      rotateY: 0,
      opacity: 1,
      transition: {
        opacity: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
        rotateY: { duration: 1.2, ease: [1, 0, 0, 1] as const }
      }
    },
    textReveal: {
      x: 0,
      rotateY: 360,
      opacity: 1,
      transition: {
        rotateY: { duration: 0.7, ease: [1, 0, 0, 1] as const }
      }
    },
    wipeRight: {
      x: '100vw',
      rotateY: 360,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1] as const
      }
    },
    fadeOut: { opacity: 0 }
  };

  const textContainerVariants = {
    logoSpin: { opacity: 0 },
    textReveal: {
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1] as const,
        staggerChildren: 0.03,
        delayChildren: 0
      }
    },
    wipeRight: {
      opacity: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
    },
    fadeOut: { opacity: 0 }
  };

  const letterVariants = {
    logoSpin: { opacity: 0, x: -10 },
    textReveal: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
    },
    wipeRight: { opacity: 0, x: 0 },
    fadeOut: { opacity: 0 }
  };

  const containerVariants = {
    logoSpin: { opacity: 1 },
    textReveal: { opacity: 1 },
    wipeRight: { opacity: 1 },
    fadeOut: { 
      opacity: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      variants={containerVariants}
      initial="logoSpin"
      animate={phase}
      style={{
        willChange: 'opacity',
        pointerEvents: phase === 'fadeOut' ? 'none' : 'auto'
      }}
    >
      <div role="status" aria-live="polite" className="sr-only">
        Loading Imperial Trading Platform
      </div>

      <div className="flex items-center gap-4 justify-center">
        <motion.img
          src={imperialLogo}
          alt="Imperial Trading Logo"
          className="w-32 h-32 md:w-40 md:h-40"
          variants={logoVariants}
          initial="logoSpin"
          animate={phase}
          style={{
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d'
          }}
        />

        <motion.div
          className="flex imperial-tech-font text-xl md:text-2xl tracking-wider text-white"
          variants={textContainerVariants}
          initial="logoSpin"
          animate={phase}
          style={{ willChange: 'opacity' }}
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
      </div>
    </motion.div>
  );
};
