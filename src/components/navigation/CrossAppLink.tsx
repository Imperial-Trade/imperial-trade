import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink } from 'lucide-react';
import { useNavigation } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';

interface CrossAppLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isExternal?: boolean;
  targetApp?: string;
  preserveSession?: boolean;
  asChild?: boolean;
}

export function CrossAppLink({
  to,
  children,
  className,
  variant = 'ghost',
  size = 'default',
  isExternal = false,
  targetApp,
  preserveSession = true,
  asChild = false,
  ...props
}: CrossAppLinkProps) {
  const { state, startNavigation, completeNavigation } = useNavigation();
  
  const isNavigatingToTarget = state.isNavigating && state.targetApp === targetApp;

  const handleClick = (e: React.MouseEvent) => {
    if (isExternal && targetApp) {
      e.preventDefault();
      startNavigation(targetApp);
      
      // Add session preservation parameters if needed
      const url = new URL(to);
      if (preserveSession) {
        // Add any session preservation logic here
        url.searchParams.set('ref', 'navigation');
      }
      
      // Simulate navigation delay for better UX
      setTimeout(() => {
        window.location.href = url.toString();
        completeNavigation();
      }, 300);
    }
  };

  if (asChild) {
    return (
      <Link 
        to={to} 
        className={className} 
        onClick={handleClick}
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "transition-all duration-200",
        isNavigatingToTarget && "opacity-75 cursor-wait",
        className
      )}
      onClick={handleClick}
      disabled={isNavigatingToTarget}
      asChild={!isExternal}
      {...props}
    >
      {isExternal ? (
        <span className="flex items-center gap-2">
          {isNavigatingToTarget ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isExternal ? (
            <ExternalLink className="h-4 w-4" />
          ) : null}
          {children}
        </span>
      ) : (
        <Link to={to}>
          {children}
        </Link>
      )}
    </Button>
  );
}