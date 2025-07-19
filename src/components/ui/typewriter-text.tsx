
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  showCursor?: boolean;
  cursorBlinkSpeed?: number;
  className?: string;
  onComplete?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 100,
  showCursor = true,
  cursorBlinkSpeed = 500,
  className,
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursorBlink, setShowCursorBlink] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

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

  return (
    <span className={cn('inline-block text-center', className)}>
      {displayedText.split('\n').map((line, index) => (
        <span key={index} className="block bg-gradient-to-r from-yellow-400 via-white to-primary bg-clip-text text-transparent">
          {line}
        </span>
      ))}
      {showCursor && (
        <span 
          className={cn(
            'inline-block w-0.5 h-[1em] bg-gradient-to-r from-yellow-400 via-white to-primary ml-1 align-middle',
            showCursorBlink ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </span>
  );
};
