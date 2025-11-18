import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, X, BellOff } from 'lucide-react';
import { useNotificationStore } from '@/contexts/NotificationStoreContext';
import { NotificationBellIcon } from '@/components/notifications/NotificationBellIcon';
import { useOneSignalPush } from '@/hooks/useOneSignalPush';
import { ProviderAvatar } from '@/components/notifications/ProviderAvatar';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { ProfitLossDisplay } from '@/components/notifications/ProfitLossDisplay';
import { ProgressIndicator } from '@/components/notifications/ProgressIndicator';
import { cn } from '@/lib/utils';

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  unreadNotifications?: number;
  onClearUnread?: () => void;
  onShowPrompt?: () => void;
}

export function NotificationSheet({ isOpen, onClose, unreadNotifications, onClearUnread, onShowPrompt }: NotificationSheetProps) {
  // ✅ Use shared notification store - receives same data as ModernNotificationSystem
  const { getRecentNotifications, notifications: allNotifications } = useNotificationStore();
  const events = getRecentNotifications(100); // Show latest 100 notifications
  const { isPushEnabled, subscribeToPush, unsubscribeFromPush, refreshSubscriptionStatus } = useOneSignalPush();
  
  // State for unsubscribe confirmation dialog
  const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);

  // ✅ CRITICAL FIX: Refresh subscription status when sheet opens
  useEffect(() => {
    if (isOpen && refreshSubscriptionStatus) {
      console.log('🔄 [Recent Activity] Sheet opened - refreshing subscription status');
      refreshSubscriptionStatus();
    }
  }, [isOpen, refreshSubscriptionStatus]);

  
  const handleConfirmUnsubscribe = async () => {
    console.log('🔕 [Recent Activity] User confirmed unsubscribe');
    setShowUnsubscribeDialog(false);
    
    try {
      const success = await unsubscribeFromPush();
      
      if (success) {
        console.log('✅ [Recent Activity] Unsubscribed successfully');
        toast({
          title: "Push Notifications Disabled",
          description: "You won't receive push notifications anymore. You can re-enable them anytime.",
        });
        
        // ✅ Force refresh status after unsubscribe
        if (refreshSubscriptionStatus) {
          setTimeout(() => refreshSubscriptionStatus(), 500);
        }
      } else {
        console.log('❌ [Recent Activity] Unsubscribe failed');
        toast({
          title: "Failed to Unsubscribe",
          description: "Please try again or check your browser settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ [Recent Activity] Error unsubscribing:', error);
      toast({
        title: "Error",
        description: "Failed to unsubscribe from notifications",
        variant: "destructive"
      });
    }
  };
  
  const handleCancelUnsubscribe = () => {
    console.log('✅ User cancelled unsubscribe');
    setShowUnsubscribeDialog(false);
  };
  
  // 🔍 DEBUG: Log notification state when sheet opens
  console.log('🔍 [NotificationSheet] Rendering:', {
    isOpen,
    totalStoredNotifications: allNotifications.length,
    eventsToDisplay: events.length,
    firstEvent: events[0],
    localStorage: localStorage.getItem('imperial-trade-notifications')?.substring(0, 100)
  });

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
      return timestamp.toLocaleTimeString();
    } catch {
      return new Date().toLocaleTimeString();
    }
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl border-border/50 inset-y-0"
      >
        <SheetHeader className="pt-2 lg:pt-20">
          <SheetTitle className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Activity
            </div>
            <NotificationBellIcon 
              className="w-5 h-5 cursor-pointer" 
              onClick={async () => {
                if (isPushEnabled) {
                  // ✅ Show confirmation before unsubscribing
                  console.log('🔔 [Recent Activity] Bell clicked - user wants to unsubscribe');
                  setShowUnsubscribeDialog(true);
                } else {
                  // ✅ Re-subscribe: Trigger native iOS prompt
                  console.log('🔔 [Recent Activity] Bell clicked - triggering native prompt to subscribe');
                  const granted = await subscribeToPush();
                  
                  if (granted) {
                    toast({
                      title: "Push Notifications Enabled",
                      description: "You'll now receive instant trade alerts!",
                    });
                    // ✅ Force refresh status after subscribe
                    if (refreshSubscriptionStatus) {
                      setTimeout(() => refreshSubscriptionStatus(), 500);
                    }
                  } else {
                    toast({
                      title: "Push Notifications Denied",
                      description: "You can enable them later from your device settings.",
                      variant: "destructive"
                    });
                  }
                }
                // Clear unread count
                if (onClearUnread) {
                  onClearUnread();
                }
              }}
            />
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-12rem)] mt-6">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No recent activity</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Signal notifications will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {events.map((event) => (
                <Card
                  key={event.id}
                  className={cn(
                    "overflow-hidden border-2 border-l-4 shadow-2xl backdrop-blur-md",
                    "bg-gradient-to-br",
                    getGradientClass(event.type),
                    getBorderColor(event.type),
                    "border-border/50"
                  )}
                >
                  <div className="p-4">
                    {/* Header with Avatar, Name, Badge, and Close Button */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <ProviderAvatar
                        displayName={event.metadata?.display_name || event.metadata?.provider_name || event.metadata?.asset_name || 'Unknown'}
                        avatarUrl={event.metadata?.provider_avatar_url}
                        userType={event.metadata?.provider_type}
                        size="md"
                        showBadge={true}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground text-sm">
                            {event.metadata?.provider_name || event.metadata?.display_name || 'Unknown Provider'}
                          </h4>
                          <NotificationBadge type={event.type} priority={event.priority} />
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {event.metadata?.asset_name || event.title}
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
                    <div>
                      <p className="text-foreground text-sm leading-relaxed">
                        {event.message}
                      </p>
                      
                      {/* Signal Notes - Styled like EDUCATOR+ badge */}
                      {event.metadata.notes && (
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-1.5 leading-relaxed">
                          {event.metadata.notes}
                        </p>
                      )}
                    </div>

                    {/* Pips and Progress on Same Line */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        {event.metadata.pips_data && 
                         event.metadata.pips_data.value !== 0 && (
                          <ProfitLossDisplay 
                            pipsData={event.metadata.pips_data}
                            size="md"
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
                            showPercentage={true}
                          />
                        </div>
                      )}
                    </div>

                    {/* Footer with Timestamp and View Signal Link */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-muted-foreground text-xs">
                        {formatTimestamp(event.timestamp)}
                      </span>
                      {event.metadata?.signal_id && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-primary text-xs p-0 h-auto hover:underline"
                          onClick={() => {
                            window.location.href = `/dashboard/signal-stream?signal=${event.metadata.signal_id}`;
                            onClose();
                          }}
                        >
                          View Signal →
                        </Button>
                      )}
                    </div>
                  </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
    
    {/* Unsubscribe Confirmation Dialog */}
    <AlertDialog open={showUnsubscribeDialog} onOpenChange={setShowUnsubscribeDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <BellOff className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">
              Unsubscribe from Notifications?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base leading-relaxed">
            Are you sure you want to turn off push notifications? You'll no longer receive instant alerts for:
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-blue-500">•</span> New trade signals
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">•</span> Take profit hits
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-500">•</span> Stop loss alerts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">•</span> Signal updates
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              You can always re-enable notifications anytime by clicking the bell icon or toggle switch.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelUnsubscribe}>
            Keep Notifications
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmUnsubscribe}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Unsubscribe
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
