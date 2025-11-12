import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationEvents } from '@/hooks/useNotificationEvents';
import { ProviderAvatar } from '@/components/notifications/ProviderAvatar';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { ProfitLossDisplay } from '@/components/notifications/ProfitLossDisplay';
import { ProgressIndicator } from '@/components/notifications/ProgressIndicator';
import { cn } from '@/lib/utils';

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSheet({ isOpen, onClose }: NotificationSheetProps) {
  const { events, loading } = useNotificationEvents();

  // Get border color based on notification type
  const getBorderColor = (type: string) => {
    switch (type) {
      case 'new_signal':
        return 'border-l-blue-500';
      case 'tp_hit':
        return 'border-l-emerald-500';
      case 'stop_loss':
        return 'border-l-red-500';
      case 'trade_closed':
        return 'border-l-green-500';
      case 'limit_activated':
        return 'border-l-purple-500';
      case 'notes_updated':
        return 'border-l-yellow-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch {
      return 'just now';
    }
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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading recent activity...</p>
            </div>
          ) : events.length === 0 ? (
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
              {events.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "p-4 rounded-lg bg-card/50 border-l-4 border-t border-r border-b border-border/50",
                    "hover:bg-card/80 transition-all duration-200",
                    getBorderColor(event.type)
                  )}
                >
                  {/* Provider Avatar & Name */}
                  <div className="flex items-start gap-3 mb-3">
                    <ProviderAvatar
                      name={event.metadata.display_name}
                      avatarUrl={event.metadata.provider_avatar_url}
                      userType={event.metadata.provider_type}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">
                          {event.metadata.provider_name}
                        </p>
                        <NotificationBadge type={event.type} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTimestamp(event.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Asset Name */}
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-foreground">
                      {event.metadata.asset_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Entry: {event.metadata.entry_price.toFixed(event.metadata.asset_name.includes('JPY') ? 3 : 5)}
                    </p>
                  </div>

                  {/* Pips Display (for TP hits, SL hits, closed trades) */}
                  {event.metadata.pips_data && (
                    <div className="mb-3">
                      <ProfitLossDisplay pipsData={event.metadata.pips_data} />
                    </div>
                  )}

                  {/* TP Progress Indicator */}
                  {event.metadata.tp_hits && event.metadata.total_tps && event.metadata.total_tps > 0 && (
                    <div className="mt-3">
                      <ProgressIndicator
                        tpHits={event.metadata.tp_hits}
                        totalTps={event.metadata.total_tps}
                      />
                    </div>
                  )}

                  {/* Message */}
                  <p className="text-xs text-muted-foreground/80 mt-2">
                    {event.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
