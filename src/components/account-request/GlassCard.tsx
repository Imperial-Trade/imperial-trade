import { FC, ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div 
      className={`rounded-2xl p-8 transition-all duration-300 ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 24px 0 rgba(0, 0, 0, 0.08)'
      }}
    >
      <style>
        {`
          .dark .rounded-2xl {
            background: rgba(15, 15, 20, 0.3) !important;
            backdrop-filter: blur(30px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(30px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.3) !important;
          }
        `}
      </style>
      {children}
    </div>
  );
};
