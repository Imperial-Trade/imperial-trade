import React, { useState, useEffect, useRef } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export const Typewriter: React.FC<TypewriterProps> = ({ text, speed = 10, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!text || text.length === 0) {
      setDisplayedText('');
      return;
    }
    
    setDisplayedText('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
        // Scroll every few characters to prevent jitter, or on new lines
        if (i % 3 === 0 || text.charAt(i) === '\n') {
             bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      } else {
        clearInterval(timer);
        // Final scroll to ensure end is visible
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 100);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
      {displayedText}
      <span className="animate-pulse text-indigo-500 inline-block w-2 h-4 bg-indigo-500 ml-1 align-middle"></span>
      <div ref={bottomRef} className="h-1" />
    </div>
  );
};
