
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/SafeThemeProvider';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  showCursor?: boolean;
  cursorBlinkSpeed?: number;
  className?: string;
  themeAware?: boolean;
  onComplete?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 100,
  showCursor = false,
  cursorBlinkSpeed = 500,
  className,
  themeAware = false,
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursorBlink, setShowCursorBlink] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Typewriter effect
  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, text, speed, isComplete, onComplete]);

  // Cursor blinking effect
  useEffect(() => {
    if (!showCursor) return;

    const blinkTimer = setInterval(() => {
      setShowCursorBlink(prev => !prev);
    }, cursorBlinkSpeed);

    return () => clearInterval(blinkTimer);
  }, [showCursor, cursorBlinkSpeed]);

  const getShimmerStyle = () => {
    if (className) return {}; // Allow className override
    
    if (themeAware) {
      // Gold to Silver gradient with shimmer (Imperial logo style)
      return {
        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 215, 0, 0.6) 10%, rgba(255, 237, 74, 1) 30%, rgba(245, 158, 11, 1) 50%, rgba(217, 119, 6, 0.8) 70%, rgba(161, 161, 170, 0.6) 90%, transparent 100%)',
        backgroundSize: '200% 100%',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
        animation: 'shimmer 6s infinite',
        backgroundPosition: '-200% 0'
      };
    }
    
    // Default gold shimmer
    return {
      background: 'linear-gradient(90deg, transparent 0%, rgba(255, 215, 0, 0.8) 20%, rgba(255, 255, 255, 1) 50%, rgba(255, 215, 0, 0.8) 80%, transparent 100%)',
      backgroundSize: '200% 100%',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      animation: 'shimmer 6s infinite',
      backgroundPosition: '-200% 0'
    };
  };

  return (
    <span className={cn('inline-block text-center', className)}>
      {displayedText.split('\n').map((line, index) => (
        <span 
          key={index} 
          className="block relative overflow-hidden"
          style={getShimmerStyle()}
        >
          {line}
        </span>
      ))}
    </span>
  );
};
