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
              Top Providers (24h)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No signals closed in last 24h
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
            Top Providers (24h)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.userId}
            className={cn(
              "flex items-center justify-between gap-2 p-2.5 rounded-lg",
              "border transition-all duration-300 hover:scale-[1.02]",
              getRankStyles(provider.rank)
            )}
          >
            {/* Left: Rank + Provider Info */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-lg flex-shrink-0">{getRankEmoji(provider.rank)}</span>
              <ProviderAvatar
                avatarUrl={provider.avatarUrl || undefined}
                displayName={provider.displayName}
                userType={provider.userType}
                size="sm"
                showBadge={true}
              />
              <div className="flex flex-col gap-0.5 min-w-0 flex-shrink">
                <span className="font-semibold text-[11px] truncate">
                  {provider.displayName}
                </span>
                <Badge 
                  variant="outline" 
                  className="capitalize text-[9px] w-fit px-1 py-0 h-4"
                >
                  {provider.userType}
                </Badge>
              </div>
            </div>

            {/* Right: Pips Display */}
            <div className="text-right flex-shrink-0">
              <div
                className={cn(
                  "text-sm font-bold flex items-center gap-0.5 justify-end whitespace-nowrap",
                  provider.totalPips >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                {provider.totalPips >= 0 ? "+" : ""}
                {provider.totalPips.toFixed(1)}
                <span className="text-[9px] text-muted-foreground font-normal">pips</span>
                {provider.totalPips >= 0 && <span className="text-xs">🟢</span>}
              </div>
              <div className="text-[9px] text-muted-foreground whitespace-nowrap">
                {provider.signalCount} trade{provider.signalCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
