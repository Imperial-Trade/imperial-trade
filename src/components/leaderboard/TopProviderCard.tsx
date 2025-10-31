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
  const { isMobile, isTablet } = useDeviceDetection();
  const isMobileOrTablet = isMobile || isTablet;
  
  const responsiveStyles = {
    trophySize: isMobileOrTablet ? 'h-4 w-4' : 'h-5 w-5',
    titleSize: isMobileOrTablet ? 'text-base' : 'text-lg',
    headerPadding: isMobileOrTablet ? 'pb-2' : 'pb-3',
    contentSpacing: isMobileOrTablet ? 'space-y-2' : 'space-y-3',
    cardPadding: isMobileOrTablet ? 'p-1.5' : 'p-2.5',
    cardGap: isMobileOrTablet ? 'gap-1' : 'gap-2',
    itemGap: isMobileOrTablet ? 'gap-1' : 'gap-1.5',
    emojiSize: isMobileOrTablet ? 'text-base' : 'text-lg',
    avatarSize: 'xs' as const,
    nameSize: isMobileOrTablet ? 'text-[10px]' : 'text-[11px]',
    badgeSize: isMobileOrTablet ? 'text-[8px]' : 'text-[9px]',
    badgeHeight: isMobileOrTablet ? 'h-3.5' : 'h-4',
    pipsSize: isMobileOrTablet ? 'text-xs' : 'text-sm',
    pipsLabelSize: isMobileOrTablet ? 'text-[8px]' : 'text-[9px]',
    tradeCountSize: isMobileOrTablet ? 'text-[8px]' : 'text-[9px]',
    greenCircle: isMobileOrTablet ? 'text-[10px]' : 'text-xs',
  };
  if (providers.length === 0) {
    return (
    <Card className={cn("w-full glass-effect border-accent/20", containerClassName)}>
        <CardHeader className={responsiveStyles.headerPadding}>
          <div className="flex items-center gap-2">
            <Trophy className={cn(responsiveStyles.trophySize, "text-accent")} />
            <CardTitle className={cn(responsiveStyles.titleSize, "font-bold bg-gradient-to-r from-accent to-accent-foreground bg-clip-text text-transparent")}>
              Top Providers (24h)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No trades closed in last 24h
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
            Top Providers (24h)
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
              <div className="flex items-center gap-1.5">
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
              <div className="flex items-center gap-1.5 pl-1">
                <ProviderAvatar
                  avatarUrl={provider.avatarUrl || undefined}
                  displayName={provider.displayName}
                  userType={provider.userType}
                  size="xs"
                  showBadge={false}
                />
                <span className={cn("font-semibold truncate", responsiveStyles.nameSize)}>
                  {provider.displayName}
                </span>
              </div>

              {/* Row 3: Pips + Trades */}
              <div className="flex items-center justify-between pl-1">
                <div className={cn(
                  "font-bold flex items-center gap-0.5 whitespace-nowrap",
                  responsiveStyles.pipsSize,
                  provider.totalPips >= 0 ? "text-green-500" : "text-red-500"
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
