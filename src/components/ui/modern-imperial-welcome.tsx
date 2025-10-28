import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Crown } from 'lucide-react';

interface ModernImperialWelcomeProps {
  onComplete?: () => void;
}

export const ModernImperialWelcome: React.FC<ModernImperialWelcomeProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'entry' | 'pulse' | 'settle' | 'exit'>('entry');
  const prefersReducedMotion = useReducedMotion();

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
    const entryTimer = setTimeout(() => setPhase('pulse'), 200);
    const pulseTimer = setTimeout(() => setPhase('settle'), 400);
    const settleTimer = setTimeout(() => setPhase('exit'), 700);
    const exitTimer = setTimeout(() => {
      document.body.style.overflow = originalOverflow;
      onComplete?.();
    }, 1500);

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
      clearTimeout(entryTimer);
      clearTimeout(pulseTimer);
      clearTimeout(settleTimer);
      clearTimeout(exitTimer);
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [onComplete, prefersReducedMotion]);

  // Skip render if reduced motion
  if (prefersReducedMotion) {
    return null;
  }

  // Animation variants for container
  const containerVariants = {
    entry: { opacity: 1 },
    exit: { 
      opacity: 0,
      transition: { 
        duration: 0.5,
        ease: [0.4, 0, 1, 1] as const
      }
    }
  };

  // Animation variants for logo
  const logoVariants = {
    entry: {
      scale: 0.8,
      opacity: 0,
      filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 20,
        duration: 0.2
      }
    },
    pulse: {
      scale: 1.05,
      opacity: 1,
      filter: 'drop-shadow(0 0 60px rgba(255, 215, 0, 0.6))',
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 15,
        duration: 0.2
      }
    },
    settle: {
      scale: 1.0,
      opacity: 1,
      filter: 'drop-shadow(0 0 50px rgba(255, 215, 0, 0.4))',
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 20,
        duration: 0.3
      }
    },
    exit: {
      scale: 1.1,
      opacity: 0,
      filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.2))',
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 1, 1] as const
      }
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      variants={containerVariants}
      initial="entry"
      animate={phase === 'exit' ? 'exit' : 'entry'}
      style={{
        willChange: 'opacity',
        pointerEvents: 'none'
      }}
    >
      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Loading Imperial Trading Platform
      </div>

      {/* Animated Logo */}
      <motion.div
        variants={logoVariants}
        initial="entry"
        animate={phase}
        className="flex items-center justify-center"
        style={{
          willChange: 'transform, opacity, filter'
        }}
      >
        <Crown 
          className="w-24 h-24 md:w-32 md:h-32 text-accent-gold"
          strokeWidth={1.5}
        />
      </motion.div>

      {/* Golden glow effect background */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        animate={{
          opacity: phase === 'pulse' ? 0.3 : phase === 'settle' ? 0.2 : 0.1
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
