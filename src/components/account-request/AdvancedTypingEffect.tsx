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
            50% { background-color: #f4f4f5; }
          }
          .animate-blink {
            animation: blink 1s infinite;
          }
        `}
      </style>
      
      {/* Imperial Logo Section */}
      <div className="flex items-center gap-5 mb-16 lg:mb-20 backdrop-blur-sm bg-black/10 p-6 rounded-lg">
        <Crown className="w-20 h-20 lg:w-24 lg:h-24 text-[#D4AF37] drop-shadow-[0_4px_12px_rgba(212,175,55,0.8)]" />
        <h1 className="text-5xl lg:text-6xl font-bold text-white tracking-wider uppercase imperial-tech-font drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          IMPERIAL
        </h1>
      </div>

      {/* Typing Animation - Fixed height container to prevent logo movement */}
      <div className="min-h-[80px] lg:min-h-[100px] flex items-center justify-center">
        <h2 className="text-3xl lg:text-4xl font-light text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {text}
          <span className="inline-block w-[2px] h-8 lg:h-10 bg-white ml-2 animate-blink drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" />
        </h2>
      </div>
    </div>
  );
};
