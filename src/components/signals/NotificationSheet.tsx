import React, { useRef, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, X } from 'lucide-react';
import { useNotificationStore } from '@/contexts/NotificationStoreContext';
import { ProviderAvatar } from '@/components/notifications/ProviderAvatar';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { ProfitLossDisplay } from '@/components/notifications/ProfitLossDisplay';
import { ProgressIndicator } from '@/components/notifications/ProgressIndicator';
import { cn } from '@/lib/utils';
import { useSignalTheme } from '@/hooks/useSignalTheme';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import type { SlideDirection } from '@/hooks/useSheetNavigation';

interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
  selectedEducators: string[];
}

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  unreadNotifications?: number;
  onClearUnread?: () => void;
  onShowPrompt?: () => void;
  filters?: FilterState;
  statusOptions?: Array<{ value: string; label: string; icon?: any }>;
  tradeTypeOptions?: Array<{ value: string; label: string; icon?: any }>;
  educatorOptions?: Array<{ id: string; name: string }>;
  canCreateSignals?: boolean;
  onCreateSignal?: () => void;
  onOpenFilterSheet?: (type: 'status' | 'tradeType' | 'educator') => void;
  onOpenNotificationSettings?: () => void;
  slideDirection?: SlideDirection;
}

export function NotificationSheet({ 
  isOpen, 
  onClose, 
  unreadNotifications, 
  onClearUnread, 
  onShowPrompt,
  filters,
  statusOptions = [],
  tradeTypeOptions = [],
  educatorOptions = [],
  canCreateSignals = false,
  onCreateSignal,
  onOpenFilterSheet,
  onOpenNotificationSettings,
  slideDirection
}: NotificationSheetProps) {
  // ✅ Use shared notification store - receives same data as ModernNotificationSystem
  const { getRecentNotifications, notifications: allNotifications } = useNotificationStore();
  const events = getRecentNotifications(100); // Show latest 100 notifications
  const { colors, isDark } = useSignalTheme();
  const { isMobile } = useDeviceDetection();
  
  // Swipe to close state
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  // 🔍 DEBUG: Log notification state when sheet opens
  console.log('🔍 [NotificationSheet] Rendering:', {
    isOpen,
    totalStoredNotifications: allNotifications.length,
    eventsToDisplay: events.length,
    firstEvent: events[0],
    localStorage: localStorage.getItem('imperial-trade-notifications')?.substring(0, 100)
  });

  // Swipe to close handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobile) {
      dragStartX.current = e.touches[0].clientY;
    } else {
    dragStartX.current = e.touches[0].clientX;
    }
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (isMobile) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - dragStartX.current;
      // Only allow dragging down (positive direction) for bottom sheet
      if (diff > 0) {
        setDragX(diff);
      }
    } else {
    const currentX = e.touches[0].clientX;
    const diff = currentX - dragStartX.current;
      // Only allow dragging to the right (positive direction) for right sheet
    if (diff > 0) {
      setDragX(diff);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);
    
    // ✅ FIX: Calculate distance directly instead of using stale state
    // Get the final touch position
    if (isMobile) {
      const finalY = e.changedTouches[0]?.clientY || dragStartX.current;
      const totalDistance = finalY - dragStartX.current;
      
      // If dragged more than 100px down, close the sheet
      if (totalDistance > 100) {
        onClose();
      }
    } else {
      const finalX = e.changedTouches[0]?.clientX || dragStartX.current;
      const totalDistance = finalX - dragStartX.current;
      
    // If dragged more than 100px to the right, close the sheet
      if (totalDistance > 100) {
      onClose();
      }
    }
    
    // Reset drag position
    setDragX(0);
  };

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

  // Get animation class based on slide direction
  const getSlideAnimationClass = () => {
    if (!slideDirection || isMobile) return '';
    switch (slideDirection) {
      case 'left': return 'sheet-slide-in-left';
      case 'right': return 'sheet-slide-in-right';
      default: return '';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={isMobile ? "bottom-mobile" : "right"}
        className={cn(
          "w-full border-border/50 [&>button]:hidden flex flex-col",
          isMobile ? "p-0" : "sm:max-w-md inset-y-0",
          getSlideAnimationClass()
        )}
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          background: isDark ? 'rgba(15, 15, 20, 0.95)' : '#FFFFFF',
          backdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
          WebkitBackdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
          paddingTop: isMobile ? 0 : 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 'max(env(safe-area-inset-bottom, 0px), 12px)',
          transform: isMobile 
            ? (isDragging ? `translateY(${dragX}px)` : undefined)
            : (isDragging ? `translateX(${dragX}px)` : undefined),
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {/* Drag Handle Indicator - Instagram style */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-400/50 rounded-full" />
          </div>
        )}
        
        {/* Swipe indicator */}
        {isDragging && dragX > 20 && !isMobile && (
          <div 
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-sm font-medium"
            style={{ opacity: Math.min(dragX / 100, 1) }}
          >
            ← Release to close
          </div>
        )}
        
        <div className={cn("flex flex-col h-full overflow-hidden", isMobile ? "px-4" : "")}>
        {/* Title Header - Desktop/Tablet only */}
        {!isMobile && (
          <div 
            className="px-6 pt-4 pb-4 border-b border-border/50 sticky top-0 z-10"
            style={{
              background: isDark ? 'rgba(15, 15, 20, 0.95)' : '#FFFFFF',
              backdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
              WebkitBackdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
            }}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" style={{ color: '#D4AF37' }} />
              <span className="text-lg font-semibold" style={{ color: colors.text.primary }}>
              Recent Activity
              </span>
            </div>
          </div>
        )}

        <div className={cn("flex-1 overflow-y-auto mt-4", isMobile ? "pb-4" : "")}>
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
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}