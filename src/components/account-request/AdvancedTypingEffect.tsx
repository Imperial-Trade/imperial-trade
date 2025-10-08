import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';

const sentences = [
  "Your imperial experience awaits.",
  "Unlock your financial potential.",
  "Trade with confidence and precision.",
  "Join a community of elite traders.",
  "Experience the future of trading."
];

export const AdvancedTypingEffect: React.FC = () => {
  const [text, setText] = useState('');
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const typingSpeed = 120;
    const deletingSpeed = 60;
    const pauseTime = 1500;

    const currentSentence = sentences[sentenceIndex];

    const timeout = setTimeout(() => {
      if (isDeleting) {
        // Deleting logic
        setText(currentSentence.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
        
        if (charIndex === 0) {
          setIsDeleting(false);
          setSentenceIndex((sentenceIndex + 1) % sentences.length);
        }
      } else {
        // Typing logic
        setText(currentSentence.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
        
        if (charIndex === currentSentence.length) {
          setIsDeleting(true);
        }
      }
    }, isDeleting ? deletingSpeed : (charIndex === currentSentence.length ? pauseTime : typingSpeed));

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, sentenceIndex]);

  return (
    <div className="typing-container flex flex-col items-center justify-center">
      <style>
        {`
          @keyframes blink {
            0%, 100% { background-color: transparent; }
            50% { background-color: #1f2937; }
          }
          .animate-blink {
            animation: blink 1s infinite;
          }
        `}
      </style>
      
      {/* Imperial Logo Section */}
      <div className="flex items-center gap-4 mb-12 lg:mb-16">
        <Crown className="w-14 h-14 lg:w-16 lg:h-16 text-[#D4AF37]" />
        <h1 className="text-4xl lg:text-5xl font-bold text-gray-800 dark:text-white tracking-wider uppercase imperial-tech-font">
          IMPERIAL
        </h1>
      </div>

      {/* Typing Animation - Fixed height container to prevent logo movement */}
      <div className="min-h-[120px] lg:min-h-[160px] flex items-center justify-center">
        <h2 className="text-5xl lg:text-6xl font-bold text-gray-800 dark:text-white tracking-tight">
          {text}
          <span className="inline-block w-[3px] h-12 lg:h-16 bg-gray-800 dark:bg-white ml-2 animate-blink" />
        </h2>
      </div>
    </div>
  );
};
