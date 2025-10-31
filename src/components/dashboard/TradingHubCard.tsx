import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/SafeThemeProvider';

interface TradingHubCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  to?: string;
  href?: string;
}

export const TradingHubCard: React.FC<TradingHubCardProps> = ({
  title,
  description,
  icon: Icon,
  iconColor,
  to,
  href,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const cardContent = (
    <div
      className="group relative h-full rounded-2xl p-5 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
      style={{
        background: isDark 
          ? 'rgba(18, 18, 20, 0.7)' 
          : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: isDark 
          ? '1px solid rgba(255, 255, 255, 0.12)' 
          : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: isDark 
          ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)' 
          : '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Subtle hover glow effect */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(0, 0, 0, 0.12)',
        }}
      />
      
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        {/* Icon */}
        <div 
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
          style={{
            background: iconColor,
          }}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        
        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-xs lg:text-sm text-zinc-400 line-clamp-2 sm:truncate">
            {description}
          </p>
        </div>
      </div>
    </div>
  );

  if (to) {
    return <Link to={to}>{cardContent}</Link>;
  }
  
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{cardContent}</a>;
  }

  return cardContent;
};
