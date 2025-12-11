import React, { useState, useEffect } from 'react';
import { SettingsIcon, CpuIcon, SparklesIcon } from './ui/Icons';

interface PhaseLoaderProps {
  onComplete: () => void;
  isReady?: boolean; // New prop to control progression
}

export const PhaseLoader: React.FC<PhaseLoaderProps> = ({ onComplete, isReady = true }) => {
  const [phase, setPhase] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Phases configuration
  const phases = [
    { text: 'Processing Log', icon: SettingsIcon },
    { text: 'AI Analyzing', icon: CpuIcon },
    { text: 'Insight Generated', icon: SparklesIcon }
  ];

  useEffect(() => {
    let timeout: any;

    const currentFullText = phases[phase].text;
    const typingSpeed = 40;
    const deletingSpeed = 20;
    const pauseBeforeDelete = 1000;
    const pauseBeforeNext = 300;
    const finishDelay = 600; 

    if (!isDeleting && displayText.length < currentFullText.length) {
      // Typing
      timeout = setTimeout(() => {
        setDisplayText(currentFullText.substring(0, displayText.length + 1));
      }, typingSpeed);
    } else if (!isDeleting && displayText.length === currentFullText.length) {
      // Finished typing current phase
      
      // CHECKPOINT: If we are at phase 1 (AI Analyzing) and NOT ready, we wait.
      if (phase === 1 && !isReady) {
          // Just spin/wait here until prop updates.
          return; 
      }

      if (phase < phases.length - 1) {
        // Wait then delete
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseBeforeDelete);
      } else {
        // Last phase (Insight Generated) - Wait then Complete
        timeout = setTimeout(() => {
          onComplete();
        }, finishDelay);
      }
    } else if (isDeleting && displayText.length > 0) {
      // Deleting
      timeout = setTimeout(() => {
        setDisplayText(currentFullText.substring(0, displayText.length - 1));
      }, deletingSpeed);
    } else if (isDeleting && displayText.length === 0) {
      // Move to next phase
      setIsDeleting(false);
      setPhase((prev) => prev + 1);
      timeout = setTimeout(() => {}, pauseBeforeNext);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, phase, onComplete, isReady]);

  // Force re-evaluation when isReady becomes true if we are stuck at phase 1 full text
  useEffect(() => {
      if (isReady && phase === 1 && displayText === phases[1].text && !isDeleting) {
          // Proceed to delete and move to next phase
          const timer = setTimeout(() => setIsDeleting(true), 800);
          return () => clearTimeout(timer);
      }
  }, [isReady, phase, displayText, isDeleting]);

  const CurrentIcon = phases[phase].icon;

  return (
    <div className="flex items-center justify-center h-full w-full gap-3 animate-in fade-in duration-300">
        {/* Icon Left */}
        <div className="text-stone-400 dark:text-slate-400">
           <CurrentIcon className={`w-5 h-5 ${phase === 0 ? 'animate-spin-slow' : 'animate-pulse'}`} />
        </div>

        {/* Text Right (Typewriter) */}
        <div className="flex items-center min-w-[140px]">
            <span className="font-mono text-sm font-bold tracking-widest uppercase text-stone-500 dark:text-slate-300">
            {displayText}
            </span>
            <span className="w-1.5 h-4 bg-stone-500 dark:bg-slate-400 animate-pulse ml-1" />
        </div>

      <style>{`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
