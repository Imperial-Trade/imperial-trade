
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  userName
}) => {
  const [step, setStep] = useState(0);

  const welcomeSteps = [
    {
      title: "Welcome to Imperial Trading!",
      content: `Congratulations ${userName}! Your account has been approved and you're now part of an exclusive trading community.`,
      icon: Crown,
      color: "text-primary"
    },
    {
      title: "Your Dashboard Awaits",
      content: "Access premium trading signals, educational content, and connect with professional traders worldwide.",
      icon: Sparkles,
      color: "text-purple-400"
    },
    {
      title: "Ready to Begin?",
      content: "Explore your new dashboard and discover all the powerful trading tools at your disposal.",
      icon: ArrowRight,
      color: "text-green-400"
    }
  ];

  const currentStep = welcomeSteps[step];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (step < welcomeSteps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 glass-effect shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <motion.div
                  key={step}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className={cn("p-3 rounded-full", currentStep.color)}
                >
                  <Icon className="w-8 h-8" />
                </motion.div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
              >
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  {currentStep.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {currentStep.content}
                </p>
              </motion.div>
              
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  {welcomeSteps.map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0.8 }}
                      animate={{ 
                        scale: index === step ? 1.2 : 0.8,
                        backgroundColor: index === step ? '#f59e0b' : '#6b7280'
                      }}
                      className="w-2 h-2 rounded-full"
                    />
                  ))}
                </div>
                
                <Button
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {step < welcomeSteps.length - 1 ? 'Next' : 'Get Started'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              {step === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ delay: 1, duration: 3, repeat: Infinity }}
                  className="absolute -top-2 -right-2 pointer-events-none"
                >
                  <div className="text-2xl">🎉</div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
