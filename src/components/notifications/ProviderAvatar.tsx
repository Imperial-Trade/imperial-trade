import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Shield, Star, Users } from 'lucide-react';

interface ProviderAvatarProps {
  avatarUrl?: string;
  displayName: string;
  userType?: 'educator' | 'educator+' | 'admin' | 'moderator' | 'member';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}

export const ProviderAvatar: React.FC<ProviderAvatarProps> = ({
  avatarUrl,
  displayName,
  userType = 'member',
  size = 'md',
  showBadge = true
}) => {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const badgeIcons = {
    admin: <Shield className="h-3 w-3" />,
    'educator+': <Star className="h-3 w-3" />,
    educator: <Star className="h-3 w-3" />,
    moderator: <Users className="h-3 w-3" />,
    member: null
  };

  const badgeColors = {
    admin: 'bg-red-500',
    'educator+': 'bg-amber-500',
    educator: 'bg-blue-500',
    moderator: 'bg-purple-500',
    member: 'bg-gray-500'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative inline-block">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      {showBadge && userType !== 'member' && (
        <div className={`absolute -bottom-1 -right-1 ${badgeColors[userType]} rounded-full p-1 border-2 border-background`}>
          {badgeIcons[userType]}
        </div>
      )}
    </div>
  );
};
