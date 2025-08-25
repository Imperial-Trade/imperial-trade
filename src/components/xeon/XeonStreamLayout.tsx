
import React from 'react';
import { motion } from 'framer-motion';

interface XeonStreamLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const XeonStreamLayout: React.FC<XeonStreamLayoutProps> = ({
  children,
  title = "Xeon Stream",
  subtitle = "Professional Trading Signals",
  actions
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-trading-bg-primary via-trading-bg-secondary to-trading-bg-primary">
      {/* Professional Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 border-b border-trading-border bg-trading-glass backdrop-blur-xl"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-trading-success to-trading-premium flex items-center justify-center">
                  <div className="w-6 h-6 rounded-lg bg-white/20 animate-pulse-glow" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-trading-success rounded-full animate-bounce-subtle" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-trading-text-primary bg-gradient-to-r from-white to-trading-text-secondary bg-clip-text text-transparent">
                  {title}
                </h1>
                <p className="text-sm text-trading-text-muted">{subtitle}</p>
              </div>
            </div>
            {actions && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {actions}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-trading-success/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-trading-premium/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  );
};
