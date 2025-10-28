import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import imperialLogo from '@/assets/imperial-logo.png';

interface ModernImperialWelcomeProps {
  onComplete?: () => void;
}

type AnimationPhase = 
  | 'logoAppear'    // 0.0-0.5s: Logo appears
  | 'logoRotate'    // 0.5-1.5s: Logo rotates top-down
  | 'textReveal'    // 0.9-2.0s: Text reveals L→R
  | 'wipeRight'     // 2.0-2.5s: Logo slides right to end of text
  | 'fadeOut';      // 2.5s: Complete

export const ModernImperialWelcome: React.FC<ModernImperialWelcomeProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<AnimationPhase>('logoAppear');
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      onComplete?.();
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => setPhase('logoRotate'), 500));
    timers.push(setTimeout(() => setPhase('textReveal'), 900));
    timers.push(setTimeout(() => setPhase('wipeRight'), 2000));
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
    logoAppear: {
      x: 0,
      rotateX: 0,
      opacity: 1,
      transition: {
        opacity: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
      }
    },
    logoRotate: {
      x: 0,
      rotateX: 360,
      opacity: 1,
      transition: {
        rotateX: { duration: 1.0, ease: [0, 0, 1, 1] as const }
      }
    },
    textReveal: {
      x: 0,
      rotateX: 360,
      opacity: 1
    },
    wipeRight: {
      x: 'calc(50vw + 200px)',
      rotateX: 360,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as const
      }
    },
    fadeOut: { opacity: 0 }
  };

  const textContainerVariants = {
    logoAppear: { opacity: 0 },
    logoRotate: { opacity: 0 },
    textReveal: {
      opacity: 1,
      transition: {
        duration: 0.5,
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
    logoAppear: { opacity: 0, x: -10 },
    logoRotate: { opacity: 0, x: -10 },
    textReveal: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
    },
    wipeRight: { opacity: 0, x: 0 },
    fadeOut: { opacity: 0 }
  };

  const containerVariants = {
    logoAppear: { opacity: 1 },
    logoRotate: { opacity: 1 },
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
      initial="logoAppear"
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
          className="w-10 h-10 md:w-12 md:h-12"
          variants={logoVariants}
          initial="logoAppear"
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
          initial="logoAppear"
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
