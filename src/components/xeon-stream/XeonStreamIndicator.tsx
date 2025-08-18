import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Zap, ZapOff } from 'lucide-react';
import { useXeonStream } from '@/contexts/XeonStreamContext';
import { cn } from '@/lib/utils';

interface XeonStreamIndicatorProps {
  className?: string;
  showText?: boolean;
}

export const XeonStreamIndicator: React.FC<XeonStreamIndicatorProps> = ({ 
  className, 
  showText = true 
}) => {
  const { isSubscribed } = useXeonStream();

  if (!isSubscribed) {
    return showText ? (
      <Badge variant="secondary" className={cn("text-xs", className)}>
        <ZapOff className="w-3 h-3 mr-1" />
        Xeon Stream Off
      </Badge>
    ) : (
      <ZapOff className={cn("w-4 h-4 text-muted-foreground", className)} />
    );
  }

  return showText ? (
    <Badge 
      variant="default" 
      className={cn(
        "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs",
        className
      )}
    >
      <Zap className="w-3 h-3 mr-1" />
      Xeon Stream Active
    </Badge>
  ) : (
    <Zap className={cn("w-4 h-4 text-primary", className)} />
  );
};