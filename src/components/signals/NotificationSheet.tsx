import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, X } from 'lucide-react';
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

  // Get gradient background based on notification type
  const getGradientClass = (type: string) => {
    const gradients: Record<string, string> = {
      new_signal: 'from-blue-500/10 via-blue-500/5 to-transparent',
      tp_hit: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      stop_loss: 'from-red-500/10 via-red-500/5 to-transparent',
      trade_closed: 'from-green-500/10 via-green-500/5 to-transparent',
      limit_activated: 'from-purple-500/10 via-purple-500/5 to-transparent',
      notes_updated: 'from-yellow-500/10 via-yellow-500/5 to-transparent',
    };
    return gradients[type] || 'from-gray-500/10 via-gray-500/5 to-transparent';
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
                    "p-4 rounded-lg overflow-hidden",
                    "border-2 border-l-4 shadow-2xl backdrop-blur-md",
                    "bg-gradient-to-br",
                    getGradientClass(event.type),
                    getBorderColor(event.type),
                    "border-border/50",
                    "hover:shadow-xl hover:scale-[1.01] transition-all duration-200"
                  )}
                >
                  {/* Header with Avatar, Name, Badge, and Close Button */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <ProviderAvatar
                        displayName={event.metadata.display_name}
                        avatarUrl={event.metadata.provider_avatar_url}
                        userType={event.metadata.provider_type}
                        size="md"
                        showBadge={true}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground text-sm">
                            {event.metadata.provider_name}
                          </h4>
                          <NotificationBadge type={event.type} />
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {event.metadata.asset_name}
                          {event.metadata.entry_price && (
                            <span className="ml-2 opacity-70">
                              • Entry: {event.metadata.entry_price.toFixed(
                                event.metadata.asset_name.includes('JPY') ? 3 : 5
                              )}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Remove from list (will be filtered on next update)
                      }}
                      className="text-muted-foreground hover:text-foreground p-1 h-auto"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Body with Message, Pips, and Progress */}
                  <div className="space-y-3">
                    <p className="text-foreground text-sm leading-relaxed">
                      {event.message}
                    </p>

                    {/* Pips and Progress on Same Line */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        {event.metadata.pips_data && 
                         event.metadata.pips_data.value !== 0 && (
                          <ProfitLossDisplay 
                            pipsData={event.metadata.pips_data} 
                          />
                        )}
                      </div>
                      
                      {event.type === 'tp_hit' &&
                       event.metadata.tp_hits &&
                       event.metadata.total_tps &&
                       event.metadata.tp_hits.some(tp => tp && tp > 0) && (
                        <div className="flex-shrink-0">
                          <ProgressIndicator
                            tpHits={event.metadata.tp_hits}
                            totalTPs={event.metadata.total_tps}
                          />
                        </div>
                      )}
                    </div>

                    {/* Footer with Timestamp and View Signal Link */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-muted-foreground text-xs">
                        {formatTimestamp(event.timestamp)}
                      </span>
                      {event.signal_id && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-primary text-xs p-0 h-auto hover:underline"
                          onClick={() => {
                            window.location.href = `/dashboard/signal-stream?signal=${event.signal_id}`;
                            onClose();
                          }}
                        >
                          View Signal →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
