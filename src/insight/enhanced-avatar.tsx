import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLevelRingColor } from '@/insight/level-badge';

interface EnhancedAvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  level: string;
  tier: number;
  /** `xs` — compact (e.g. comment threads; smaller than post `sm`). */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function EnhancedAvatar({ 
  src, 
  alt, 
  fallback, 
  level, 
  tier, 
  size = 'md', 
  className 
}: EnhancedAvatarProps) {
  const ringColor = getLevelRingColor(level);
  const isAllStar = tier === 2;

  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-32 w-32'
  };

  const crownSizes = {
    xs: 'h-2.5 w-2.5 -top-0.5 -right-0.5 p-0.5',
    sm: 'h-3 w-3 -top-1 -right-1',
    md: 'h-4 w-4 -top-1.5 -right-1.5',
    lg: 'h-5 w-5 -top-2 -right-2',
    xl: 'h-6 w-6 -top-3 -right-3'
  };

  return (
    <Avatar 
      className={cn(
        sizeClasses[size],
        'ring-2 ring-offset-2 ring-offset-background relative',
        ringColor,
        className
      )}
    >
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback>{fallback}</AvatarFallback>
      
      {isAllStar && (
        <div 
          className={cn(
            'absolute rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 p-1 shadow-lg',
            crownSizes[size]
          )}
        >
          <Crown className="h-full w-full text-white" />
        </div>
      )}
    </Avatar>
  );
}