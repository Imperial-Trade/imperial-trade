import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div 
      className={`rounded-3xl p-8 backdrop-blur-xl transition-all duration-300 ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.55)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
      }}
    >
      <style>
        {`
          .dark .rounded-3xl {
            background: rgba(31, 41, 55, 0.85) !important;
            border: 1px solid rgba(75, 85, 99, 0.3) !important;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4) !important;
          }
        `}
      </style>
      {children}
    </div>
  );
};
