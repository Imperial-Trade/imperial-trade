import React from 'react';
import { LucideIcon } from 'lucide-react';

interface LegalSectionProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'info' | 'success';
}

export const LegalSection: React.FC<LegalSectionProps> = ({ 
  icon: Icon, 
  title, 
  children, 
  variant = 'default' 
}) => {
  const borderColors = {
    default: 'border-l-accent-gold',
    warning: 'border-l-accent-red',
    info: 'border-l-accent-blue',
    success: 'border-l-accent-green'
  };

  const iconColors = {
    default: 'text-accent-gold',
    warning: 'text-accent-red', 
    info: 'text-accent-blue',
    success: 'text-accent-green'
  };

  return (
    <section className={`mb-8 border-l-4 ${borderColors[variant]} bg-card/50 backdrop-blur-sm p-6 rounded-r-lg shadow-sm hover:shadow-md transition-all duration-300`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 p-3 rounded-lg bg-surface ${iconColors[variant]} shadow-sm`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
            {title}
          </h2>
          <div className="text-muted-foreground space-y-4">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
};