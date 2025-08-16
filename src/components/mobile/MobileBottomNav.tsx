import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  TrendingUp, 
  BookOpen, 
  Zap, 
  MoreHorizontal 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  badge?: boolean;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', href: '/dashboard' },
  { icon: TrendingUp, label: 'Signals', href: '/dashboard/signals' },
  { icon: BookOpen, label: 'Academy', href: '/dashboard/education' },
  { icon: Zap, label: 'Live', href: '/dashboard/live' },
  { icon: MoreHorizontal, label: 'More', href: '/dashboard/tools' }
];

export function MobileBottomNav() {
  const location = useLocation();
  const { triggerHaptic } = useHapticFeedback();

  const handleNavClick = (href: string) => {
    triggerHaptic('light');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mobile-nav bg-background/95 backdrop-blur-xl border-t border-border/50 lg:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => handleNavClick(item.href)}
              className={cn(
                'flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-xl transition-all duration-200 touch-target mobile-active relative',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                active 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={`Navigate to ${item.label}`}
            >
              <div className={cn(
                'p-2 rounded-xl transition-all duration-200',
                active && 'bg-primary/10'
              )}>
                <Icon className={cn(
                  'h-5 w-5 transition-all duration-200',
                  active && 'scale-110'
                )} />
              </div>
              <span className={cn(
                'text-xs font-medium mt-1 leading-none transition-all duration-200',
                active ? 'opacity-100' : 'opacity-70'
              )}>
                {item.label}
              </span>
              
              {/* Badge indicator */}
              {item.badge && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent-red rounded-full animate-pulse" />
              )}
              
              {/* Active indicator */}
              {active && (
                <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
      
      {/* Safe area spacer */}
      <div style={{ height: 'var(--safe-area-bottom)' }} />
    </nav>
  );
}