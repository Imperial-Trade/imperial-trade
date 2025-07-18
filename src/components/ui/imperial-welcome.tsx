
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, Crown } from 'lucide-react';

interface ImperialWelcomeProps {
  firstName: string;
  lastName: string;
  onComplete?: () => void;
  showButton?: boolean;
  className?: string;
}

export const ImperialWelcome: React.FC<ImperialWelcomeProps> = ({
  firstName,
  lastName,
  onComplete,
  showButton = true,
  className
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [showCtaButton, setShowCtaButton] = useState(false);

  // The full welcome message with HTML for styling
  const fullMessage = `Welcome to Imperial, <span class="imperial-name">${firstName} ${lastName}</span>. The Imperial experience awaits.`;
  
  // Plain text version for character counting
  const plainText = `Welcome to Imperial, ${firstName} ${lastName}. The Imperial experience awaits.`;
  
  const typingSpeed = 80; // milliseconds per character

  useEffect(() => {
    if (currentIndex < plainText.length) {
      const timer = setTimeout(() => {
        // Check if we're at the name part
        const nameStartIndex = plainText.indexOf(firstName);
        const nameEndIndex = nameStartIndex + firstName.length + lastName.length + 1; // +1 for space
        
        if (currentIndex === nameStartIndex) {
          // Add the entire name with styling at once
          const beforeName = plainText.substring(0, nameStartIndex);
          const nameWithStyling = `<span class="imperial-name">${firstName} ${lastName}</span>`;
          const afterNameChar = plainText.charAt(nameEndIndex);
          
          setDisplayedText(beforeName + nameWithStyling + afterNameChar);
          setCurrentIndex(nameEndIndex + 1);
        } else if (currentIndex >= nameStartIndex && currentIndex < nameEndIndex) {
          // Skip individual name characters since we added them all at once
          setCurrentIndex(currentIndex + 1);
        } else {
          // Add regular character
          setDisplayedText(prev => {
            const beforeName = plainText.substring(0, nameStartIndex);
            const nameWithStyling = `<span class="imperial-name">${firstName} ${lastName}</span>`;
            const afterName = plainText.substring(nameEndIndex, currentIndex + 1);
            
            if (currentIndex < nameStartIndex) {
              return plainText.substring(0, currentIndex + 1);
            } else {
              return beforeName + nameWithStyling + afterName;
            }
          });
          setCurrentIndex(currentIndex + 1);
        }
      }, typingSpeed);

      return () => clearTimeout(timer);
    } else if (!isTypingComplete) {
      // Typing is complete
      setIsTypingComplete(true);
      setShowCursor(false);
      
      // Show CTA button after a short delay
      setTimeout(() => {
        setShowCtaButton(true);
        onComplete?.();
      }, 500);
    }
  }, [currentIndex, plainText.length, firstName, lastName, isTypingComplete, onComplete]);

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center space-y-8",
      className
    )}>
      {/* Imperial Crown Icon */}
      <div className="mb-4">
        <Crown className="h-16 w-16 lg:h-20 lg:w-20 text-imperial-gold animate-imperial-glow" />
      </div>

      {/* Welcome Text with Typewriter Effect */}
      <h1 
        className={cn(
          "font-playfair font-bold text-imperial-light",
          "text-4xl sm:text-5xl lg:text-6xl xl:text-7xl",
          "leading-tight tracking-wide",
          showCursor && !isTypingComplete && "border-r-4 border-imperial-gold animate-blink-cursor",
          "min-h-[200px] lg:min-h-[280px] flex items-center"
        )}
        dangerouslySetInnerHTML={{ __html: displayedText }}
      />

      {/* Call to Action Button */}
      {showButton && (
        <Button
          className={cn(
            "imperial-cta-button",
            "bg-imperial-gold hover:bg-imperial-gold/90 text-imperial-dark",
            "font-montserrat font-bold text-lg",
            "px-8 py-4 rounded-full",
            "transition-all duration-300 ease-out",
            "hover:-translate-y-1 hover:shadow-lg hover:shadow-imperial-gold/20",
            "transform-gpu",
            showCtaButton ? "opacity-100 animate-fade-in" : "opacity-0"
          )}
          size="lg"
        >
          Enter Dashboard
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      )}

      {/* Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-imperial-gold/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

    </div>
  );
};
