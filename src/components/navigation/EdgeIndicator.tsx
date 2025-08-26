
import React from 'react';
import { motion } from 'framer-motion';

interface EdgeIndicatorProps {
  isVisible: boolean;
  canTrigger: boolean;
}

export function EdgeIndicator({ isVisible, canTrigger }: EdgeIndicatorProps) {
  if (isVisible || !canTrigger) return null;

  return (
    <motion.div
      className="fixed left-0 top-16 sm:top-20 z-50 w-1 h-32 bg-gradient-to-b from-transparent via-primary/40 to-transparent pointer-events-none"
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full h-full bg-primary/20 backdrop-blur-sm rounded-r-full shadow-lg" />
    </motion.div>
  );
}
