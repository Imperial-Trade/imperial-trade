
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  steps,
  currentStep,
  className
}) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 relative",
                  step.status === 'completed' && "bg-green-500 border-green-500 text-white",
                  step.status === 'current' && "bg-primary border-primary text-white",
                  step.status === 'pending' && "bg-muted border-muted-foreground text-muted-foreground",
                  step.status === 'error' && "bg-red-500 border-red-500 text-white"
                )}
              >
                {step.status === 'completed' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <CheckCircle className="w-6 h-6" />
                  </motion.div>
                )}
                {step.status === 'current' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-6 h-6" />
                  </motion.div>
                )}
                {step.status === 'pending' && <Circle className="w-6 h-6" />}
                {step.status === 'error' && <XCircle className="w-6 h-6" />}
              </motion.div>
              
              {index < steps.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ 
                    scaleX: index < currentStep ? 1 : 0.3,
                    backgroundColor: index < currentStep ? '#10b981' : '#6b7280'
                  }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex-1 h-0.5 mx-4 bg-muted-foreground origin-left"
                />
              )}
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="mt-3 text-center"
            >
              <p className={cn(
                "text-sm font-medium",
                step.status === 'completed' && "text-green-400",
                step.status === 'current' && "text-primary",
                step.status === 'pending' && "text-muted-foreground",
                step.status === 'error' && "text-red-400"
              )}>
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
              )}
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
};
