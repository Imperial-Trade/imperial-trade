import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProviderAvatar } from '@/components/notifications/ProviderAvatar';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TopProvider } from '@/hooks/useTopSignalProviders';

interface TopProviderCardProps {
  providers: TopProvider[];
  containerClassName?: string;
}

const getRankEmoji = (rank: 1 | 2 | 3): string => {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
  }
};

const getRankStyles = (rank: 1 | 2 | 3): string => {
  switch (rank) {
    case 1:
      return 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-600/10 hover:shadow-lg hover:shadow-yellow-500/20';
    case 2:
      return 'border-gray-400/30 bg-gradient-to-br from-gray-300/10 to-zinc-400/10 hover:shadow-md hover:shadow-gray-400/20';
    case 3:
      return 'border-orange-500/30 bg-gradient-to-br from-orange-600/10 to-amber-800/10 hover:shadow-sm hover:shadow-orange-500/20';
  }
};

export const TopProviderCard: React.FC<TopProviderCardProps> = ({ 
  providers, 
  containerClassName 
}) => {
  if (providers.length === 0) {
    return (
      <Card className={cn("w-full glass-effect border-accent/20", containerClassName)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <CardTitle className="text-lg font-bold bg-gradient-to-r from-accent to-accent-foreground bg-clip-text text-transparent">
              Top Providers Today
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No signals closed yet today
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full glass-effect border-accent/20", containerClassName)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          <CardTitle className="text-lg font-bold bg-gradient-to-r from-accent to-accent-foreground bg-clip-text text-transparent">
            Top Providers Today
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.userId}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              "border transition-all duration-300 hover:scale-[1.02]",
              getRankStyles(provider.rank)
            )}
          >
            {/* Left: Rank + Provider Info */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getRankEmoji(provider.rank)}</span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <ProviderAvatar
                    avatarUrl={provider.avatarUrl || undefined}
                    displayName={provider.displayName}
                    userType={provider.userType}
                    size="sm"
                    showBadge={true}
                  />
                  <span className="font-semibold text-sm truncate max-w-[120px]">
                    {provider.displayName}
                  </span>
                </div>
                <Badge 
                  variant="outline" 
                  className="capitalize text-xs w-fit"
                >
                  {provider.userType}
                </Badge>
              </div>
            </div>

            {/* Right: Pips Display */}
            <div className="text-right">
              <div
                className={cn(
                  "text-xl font-bold flex items-center gap-1 justify-end",
                  provider.totalPips >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                {provider.totalPips >= 0 ? "+" : ""}
                {provider.totalPips.toFixed(1)}
                <span className="text-xs text-muted-foreground font-normal">pips</span>
                {provider.totalPips >= 0 && <span>🟢</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {provider.signalCount} signal{provider.signalCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
