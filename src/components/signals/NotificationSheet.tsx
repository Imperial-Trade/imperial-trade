import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bell, TrendingUp, TrendingDown } from 'lucide-react';
import { format, isToday, isYesterday, subDays } from 'date-fns';
import { useSignalRealtime } from '@/hooks/useSignalRealtime';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSheet({ isOpen, onClose }: NotificationSheetProps) {
  const { user } = useAuth();
  const { alerts } = useSignalRealtime(user?.id || '', true);

  // Get signals from last 24 hours with status changes
  const recentSignals = useMemo(() => {
    const yesterday = subDays(new Date(), 1);
    
    return alerts
      .filter(signal => {
        const updatedAt = new Date(signal.updatedAt);
        return updatedAt >= yesterday;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 20); // Limit to 20 most recent
  }, [alerts]);

  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'closed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'partially_profited':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getTpHits = (signal: any) => {
    const hits = [];
    if (signal.tp1Hit) hits.push('TP1');
    if (signal.tp2Hit) hits.push('TP2');
    if (signal.tp3Hit) hits.push('TP3');
    if (signal.tp4Hit) hits.push('TP4');
    if (signal.tp5Hit) hits.push('TP5');
    return hits;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl border-border/50"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Recent Activity
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          {recentSignals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No recent activity</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Signal updates will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {recentSignals.map((signal) => {
                const tpHits = getTpHits(signal);
                const updatedAt = new Date(signal.updatedAt);

                return (
                  <div
                    key={signal.id}
                    className="p-4 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors"
                  >
                    {/* Asset & Time */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {signal.tradeType.includes('buy') ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                        <span className="font-semibold text-foreground">
                          {signal.assetName}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(updatedAt)}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <Badge 
                      variant="outline" 
                      className={`mb-2 ${getStatusColor(signal.status)}`}
                    >
                      {signal.status.replace('_', ' ')}
                    </Badge>

                    {/* TP Hits */}
                    {tpHits.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tpHits.map((tp) => (
                          <Badge
                            key={tp}
                            variant="secondary"
                            className="text-xs bg-green-500/10 text-green-400 border-green-500/20"
                          >
                            {tp} ✓
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Educator */}
                    {signal.creator?.display_name && (
                      <p className="text-xs text-muted-foreground mt-2">
                        by {signal.creator.display_name}
                      </p>
                    )}

                    {/* Time */}
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {format(updatedAt, 'h:mm a')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
