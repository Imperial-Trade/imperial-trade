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
  const mobileStyles = {
    rank1: {
      avatarSize: 'md' as const,
      nameSize: 'text-xs',
      pipsSize: 'text-lg',
      medalSize: 'text-3xl',
      badgeSize: 'text-[9px]',
      badgeHeight: 'h-4',
      pipsLabelSize: 'text-[10px]',
      tradeCountSize: 'text-[10px]',
      padding: 'p-3',
    },
    rank23: {
      avatarSize: 'xs' as const,
      nameSize: 'text-[10px]',
      pipsSize: 'text-sm',
      medalSize: 'text-xl',
      badgeSize: 'text-[8px]',
      badgeHeight: 'h-3',
      pipsLabelSize: 'text-[9px]',
      tradeCountSize: 'text-[9px]',
      padding: 'p-2',
    }
  };
  if (providers.length === 0) {
    return (
    <Card className={cn("w-full glass-effect border-accent/20", containerClassName)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <CardTitle className="text-lg font-bold bg-gradient-to-r from-accent to-accent-foreground bg-clip-text text-transparent">
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
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          <CardTitle className="text-lg font-bold bg-gradient-to-r from-accent to-accent-foreground bg-clip-text text-transparent">
            Top Providers (7d)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Rank #1 - Full Width Card */}
        {providers[0] && (
          <div
            className={cn(
              "relative rounded-xl border transition-all duration-300",
              mobileStyles.rank1.padding,
              getRankStyles(1)
            )}
          >
            {/* Medal Icon - Absolute Top Right */}
            <div className="absolute top-2 right-2">
              <span className={mobileStyles.rank1.medalSize}>🥇</span>
            </div>

            {/* Centered Avatar */}
            <div className="flex justify-center mb-2">
              <ProviderAvatar
                avatarUrl={providers[0].avatarUrl || undefined}
                displayName={providers[0].displayName}
                userType={providers[0].userType}
                size={mobileStyles.rank1.avatarSize}
                showBadge={false}
              />
            </div>

            {/* Centered Name */}
            <div className="text-center mb-1">
              <p className={cn("font-bold truncate", mobileStyles.rank1.nameSize)}>
                {providers[0].displayName}
              </p>
            </div>

            {/* Centered Badge */}
            <div className="flex justify-center mb-2">
              <Badge 
                variant="outline" 
                className={cn("capitalize px-1.5 py-0", mobileStyles.rank1.badgeSize, mobileStyles.rank1.badgeHeight)}
              >
                {providers[0].userType}
              </Badge>
            </div>

            {/* Bottom Row: Pips (left) | Trades (right) */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className={cn(
                "font-bold flex items-center gap-0.5",
                mobileStyles.rank1.pipsSize,
                providers[0].totalPips >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {providers[0].totalPips >= 0 ? "+" : ""}
                {providers[0].totalPips.toFixed(1)}
                <span className={cn("text-muted-foreground font-normal", mobileStyles.rank1.pipsLabelSize)}>pips</span>
                {providers[0].totalPips >= 0 && <span className="text-xs">🟢</span>}
              </div>
              <div className={cn("text-foreground", mobileStyles.rank1.tradeCountSize)}>
                {providers[0].signalCount} trade{providers[0].signalCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {/* Ranks #2 and #3 - Side by Side Grid */}
        {providers.length > 1 && (
          <div className="grid grid-cols-2 gap-2">
            {/* Rank #2 */}
            {providers[1] && (
              <div
                className={cn(
                  "relative rounded-xl border transition-all duration-300",
                  mobileStyles.rank23.padding,
                  getRankStyles(2)
                )}
              >
                {/* Medal Icon - Absolute Top Right */}
                <div className="absolute top-1.5 right-1.5">
                  <span className={mobileStyles.rank23.medalSize}>🥈</span>
                </div>

                {/* Centered Avatar */}
                <div className="flex justify-center mb-1.5 mt-4">
                  <ProviderAvatar
                    avatarUrl={providers[1].avatarUrl || undefined}
                    displayName={providers[1].displayName}
                    userType={providers[1].userType}
                    size={mobileStyles.rank23.avatarSize}
                    showBadge={false}
                  />
                </div>

                {/* Centered Name (truncated) */}
                <div className="text-center mb-1">
                  <p className={cn("font-semibold truncate", mobileStyles.rank23.nameSize)}>
                    {providers[1].displayName}
                  </p>
                </div>

                {/* Centered Badge */}
                <div className="flex justify-center mb-1.5">
                  <Badge 
                    variant="outline" 
                    className={cn("capitalize px-1 py-0", mobileStyles.rank23.badgeSize, mobileStyles.rank23.badgeHeight)}
                  >
                    {providers[1].userType}
                  </Badge>
                </div>

                {/* Pips Display */}
                <div className="text-center mb-0.5">
                  <div className={cn(
                    "font-bold inline-flex items-center gap-0.5",
                    mobileStyles.rank23.pipsSize,
                    providers[1].totalPips >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {providers[1].totalPips >= 0 ? "+" : ""}
                    {providers[1].totalPips.toFixed(1)}
                    <span className={cn("text-muted-foreground font-normal", mobileStyles.rank23.pipsLabelSize)}>pips</span>
                  </div>
                </div>

                {/* Trades Count */}
                <div className={cn("text-center text-foreground", mobileStyles.rank23.tradeCountSize)}>
                  {providers[1].signalCount} trade{providers[1].signalCount !== 1 ? 's' : ''}
                </div>
              </div>
            )}

            {/* Rank #3 */}
            {providers[2] && (
              <div
                className={cn(
                  "relative rounded-xl border transition-all duration-300",
                  mobileStyles.rank23.padding,
                  getRankStyles(3)
                )}
              >
                {/* Medal Icon - Absolute Top Right */}
                <div className="absolute top-1.5 right-1.5">
                  <span className={mobileStyles.rank23.medalSize}>🥉</span>
                </div>

                {/* Centered Avatar */}
                <div className="flex justify-center mb-1.5 mt-4">
                  <ProviderAvatar
                    avatarUrl={providers[2].avatarUrl || undefined}
                    displayName={providers[2].displayName}
                    userType={providers[2].userType}
                    size={mobileStyles.rank23.avatarSize}
                    showBadge={false}
                  />
                </div>

                {/* Centered Name (truncated) */}
                <div className="text-center mb-1">
                  <p className={cn("font-semibold truncate", mobileStyles.rank23.nameSize)}>
                    {providers[2].displayName}
                  </p>
                </div>

                {/* Centered Badge */}
                <div className="flex justify-center mb-1.5">
                  <Badge 
                    variant="outline" 
                    className={cn("capitalize px-1 py-0", mobileStyles.rank23.badgeSize, mobileStyles.rank23.badgeHeight)}
                  >
                    {providers[2].userType}
                  </Badge>
                </div>

                {/* Pips Display */}
                <div className="text-center mb-0.5">
                  <div className={cn(
                    "font-bold inline-flex items-center gap-0.5",
                    mobileStyles.rank23.pipsSize,
                    providers[2].totalPips >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {providers[2].totalPips >= 0 ? "+" : ""}
                    {providers[2].totalPips.toFixed(1)}
                    <span className={cn("text-muted-foreground font-normal", mobileStyles.rank23.pipsLabelSize)}>pips</span>
                  </div>
                </div>

                {/* Trades Count */}
                <div className={cn("text-center text-foreground", mobileStyles.rank23.tradeCountSize)}>
                  {providers[2].signalCount} trade{providers[2].signalCount !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
