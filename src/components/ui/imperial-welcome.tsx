import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TypewriterText } from '@/components/ui/typewriter-text';
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
  const [showCtaButton, setShowCtaButton] = useState(false);

  const welcomeText = `Welcome to Imperial, ${firstName} ${lastName}. The Imperial experience awaits.`;

  const handleTypewriterComplete = () => {
    setTimeout(() => {
      setShowCtaButton(true);
      onComplete?.();
    }, 500);
  };

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
      <TypewriterText
        text={welcomeText}
        speed={80}
        showCursor={true}
        cursorBlinkSpeed={500}
        onComplete={handleTypewriterComplete}
        className={cn(
          "font-playfair font-bold text-imperial-light",
          "text-4xl sm:text-5xl lg:text-6xl xl:text-7xl",
          "leading-tight tracking-wide",
          "min-h-[200px] lg:min-h-[280px] flex items-center"
        )}
      />

      {/* Call to Action Button */}
      {showButton && (
        <Button
          className={cn(
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