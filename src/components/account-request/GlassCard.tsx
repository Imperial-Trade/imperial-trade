import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div 
      className={`rounded-3xl p-8 transition-all duration-300 ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(25px) saturate(150%)',
        WebkitBackdropFilter: 'blur(25px) saturate(150%)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)'
      }}
    >
      <style>
        {`
          .dark .rounded-3xl {
            background: rgba(28, 28, 32, 0.6) !important;
            backdrop-filter: blur(25px) saturate(150%) !important;
            -webkit-backdrop-filter: blur(25px) saturate(150%) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37) !important;
          }
        `}
      </style>
      {children}
    </div>
  );
};
