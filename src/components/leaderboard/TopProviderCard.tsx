import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProviderAvatar } from '@/components/notifications/ProviderAvatar';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
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
  const responsiveStyles = {
    trophySize: 'h-5 w-5',
    titleSize: 'text-lg',
    headerPadding: 'pb-3',
    contentSpacing: 'space-y-3',
    cardPadding: 'p-3',
    emojiSize: 'text-lg',
    avatarSize: 'xs' as const,
    nameSize: 'text-sm',
    badgeSize: 'text-xs',
    badgeHeight: 'h-4',
    pipsSize: 'text-sm',
    pipsLabelSize: 'text-xs',
    tradeCountSize: 'text-xs',
    greenCircle: 'text-xs',
  };
  if (providers.length === 0) {
    return (
    <Card className={cn("w-full glass-effect border-accent/20", containerClassName)}>
        <CardHeader className={responsiveStyles.headerPadding}>
          <div className="flex items-center gap-2">
            <Trophy className={cn(responsiveStyles.trophySize, "text-accent")} />
            <CardTitle className={cn(responsiveStyles.titleSize, "font-bold bg-gradient-to-r from-accent to-accent-foreground bg-clip-text text-transparent")}>
              Top Providers (7d)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No trades closed in last 7 days
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full glass-effect border-accent/20", containerClassName)}>
      <CardHeader className={responsiveStyles.headerPadding}>
        <div className="flex items-center gap-2">
          <Trophy className={cn(responsiveStyles.trophySize, "text-accent")} />
          <CardTitle className={cn(responsiveStyles.titleSize, "font-bold bg-gradient-to-r from-accent to-accent-foreground bg-clip-text text-transparent")}>
            Top Providers (7d)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className={responsiveStyles.contentSpacing}>
        {providers.map((provider) => (
          <div
            key={provider.userId}
            className={cn(
              "rounded-lg",
              responsiveStyles.cardPadding,
              "border transition-all duration-300 hover:scale-[1.02]",
              getRankStyles(provider.rank)
            )}
          >
            <div className="flex flex-col gap-1 w-full">
              {/* Row 1: Rank Emoji + Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(responsiveStyles.emojiSize, "flex-shrink-0")}>
                  {getRankEmoji(provider.rank)}
                </span>
                <Badge 
                  variant="outline" 
                  className={cn("capitalize px-1.5 py-0", responsiveStyles.badgeSize, responsiveStyles.badgeHeight)}
                >
                  {provider.userType}
                </Badge>
              </div>

              {/* Row 2: Small Avatar + Name */}
              <div className="flex items-center gap-2 pl-1 min-w-0">
                <div className="flex-shrink-0">
                  <ProviderAvatar
                    avatarUrl={provider.avatarUrl || undefined}
                    displayName={provider.displayName}
                    userType={provider.userType}
                    size="xs"
                    showBadge={false}
                  />
                </div>
                <span className={cn("font-semibold min-w-0", responsiveStyles.nameSize)}>
                  {provider.displayName}
                </span>
              </div>

              {/* Row 3: Pips + Trades */}
              <div className="flex items-center justify-between pl-1 gap-2">
                <div className={cn(
                  "font-bold flex items-center gap-0.5 whitespace-nowrap",
                  responsiveStyles.pipsSize,
                  provider.totalPips >= 0 ? "text-green-600" : "text-red-500"
                )}>
                  {provider.totalPips >= 0 ? "+" : ""}
                  {provider.totalPips.toFixed(1)}
                  <span className={cn("text-muted-foreground font-normal", responsiveStyles.pipsLabelSize)}>pips</span>
                  {provider.totalPips >= 0 && <span className={responsiveStyles.greenCircle}>🟢</span>}
                </div>
                <div className={cn("text-muted-foreground whitespace-nowrap", responsiveStyles.tradeCountSize)}>
                  {provider.signalCount} trade{provider.signalCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
