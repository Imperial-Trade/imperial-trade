
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfessionalToastProps {
  type: 'success' | 'error' | 'warning' | 'info' | 'celebration';
  title: string;
  description?: string;
  isVisible: boolean;
  onClose: () => void;
  progress?: number;
  duration?: number;
}

export const ProfessionalToast: React.FC<ProfessionalToastProps> = ({
  type,
  title,
  description,
  isVisible,
  onClose,
  progress,
  duration = 4000
}) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Clock,
    celebration: Sparkles
  };

  const colors = {
    success: 'border-green-500 bg-green-500/10 text-green-400',
    error: 'border-red-500 bg-red-500/10 text-red-400',
    warning: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
    info: 'border-blue-500 bg-blue-500/10 text-blue-400',
    celebration: 'border-purple-500 bg-purple-500/10 text-purple-400'
  };

  const Icon = icons[type];

  React.useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.4 
          }}
          className={cn(
            "fixed top-4 right-4 z-50 p-4 rounded-lg border-2 shadow-lg backdrop-blur-sm max-w-sm w-full",
            colors[type],
            "glass-effect"
          )}
        >
          <div className="flex items-start gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
            >
              <Icon className="w-6 h-6 flex-shrink-0" />
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <motion.h4 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="font-semibold text-white text-sm leading-tight"
              >
                {title}
              </motion.h4>
              
              {description && (
                <motion.p 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-gray-300 text-xs mt-1 leading-relaxed"
                >
                  {description}
                </motion.p>
              )}
              
              {progress !== undefined && (
                <motion.div 
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-2"
                >
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <motion.div 
                      className="bg-primary h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 mt-1">{progress}% complete</span>
                </motion.div>
              )}
            </div>
            
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            >
              <XCircle className="w-4 h-4" />
            </motion.button>
          </div>
          
          {type === 'celebration' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ delay: 0.5, duration: 2, repeat: 2 }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="absolute top-2 left-2 text-yellow-400">✨</div>
              <div className="absolute top-3 right-8 text-purple-400">🎉</div>
              <div className="absolute bottom-3 left-8 text-blue-400">⭐</div>
              <div className="absolute bottom-2 right-2 text-green-400">🎊</div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
