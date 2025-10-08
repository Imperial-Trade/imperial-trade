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
    <div className="typing-container flex items-center justify-center">
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

      {/* Typing Animation */}
      <h2 className="text-5xl lg:text-6xl font-bold text-zinc-100 tracking-tight">
        {text}
        <span className="inline-block w-[3px] h-12 lg:h-16 bg-zinc-100 ml-2 animate-blink" />
      </h2>
    </div>
  );
};
