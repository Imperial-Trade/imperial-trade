import React, { useMemo } from 'react';
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose
} from "@/components/ui/drawer";
import { Bell, X, Clock, TrendingUp, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react';
import { useSignalTheme } from '@/hooks/useSignalTheme';
import { useSignalRealtime } from '@/contexts/SignalRealtimeContext';
import { formatDistanceToNow } from 'date-fns';

interface NotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSheet({
  isOpen,
  onClose
}: NotificationSheetProps) {
  const { colors } = useSignalTheme();
  const { signals } = useSignalRealtime();

  // Generate notifications from recent signal activity
  const notifications = useMemo(() => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return signals
      .filter(signal => {
        const updatedAt = new Date(signal.updated_at);
        return updatedAt >= last24Hours;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 20) // Limit to 20 most recent
      .map(signal => {
        const createdAt = new Date(signal.created_at);
        const updatedAt = new Date(signal.updated_at);
        const isNew = createdAt >= last24Hours;
        const wasUpdated = updatedAt > createdAt && updatedAt >= last24Hours;

        let type: 'new' | 'active' | 'closed' | 'tp_hit' = 'new';
        let message = '';

        if (signal.status === 'closed') {
          type = 'closed';
          message = `Signal closed: ${signal.symbol}`;
        } else if (signal.take_profit_1_hit || signal.take_profit_2_hit || signal.take_profit_3_hit) {
          type = 'tp_hit';
          const tpLevels = [];
          if (signal.take_profit_1_hit) tpLevels.push('TP1');
          if (signal.take_profit_2_hit) tpLevels.push('TP2');
          if (signal.take_profit_3_hit) tpLevels.push('TP3');
          message = `${tpLevels.join(', ')} hit: ${signal.symbol}`;
        } else if (signal.status === 'active' && wasUpdated) {
          type = 'active';
          message = `Signal updated: ${signal.symbol}`;
        } else if (isNew) {
          type = 'new';
          message = `New signal: ${signal.symbol}`;
        } else {
          return null;
        }

        return {
          id: signal.id,
          type,
          message,
          symbol: signal.symbol,
          tradeType: signal.trade_type,
          status: signal.status,
          timestamp: updatedAt,
          educatorName: signal.profile?.full_name || 'Unknown Educator'
        };
      })
      .filter(Boolean);
  }, [signals]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new':
        return <Bell className="w-5 h-5" />;
      case 'active':
        return <Clock className="w-5 h-5" />;
      case 'closed':
        return <CheckCircle className="w-5 h-5" />;
      case 'tp_hit':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new':
        return colors.accent.primary;
      case 'active':
        return colors.accent.blue;
      case 'closed':
        return colors.accent.green;
      case 'tp_hit':
        return colors.accent.green;
      default:
        return colors.text.tertiary;
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent 
        className="max-h-[70vh] rounded-t-3xl z-[110]"
        style={{
          background: colors.bg.glass,
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderTop: `2px solid ${colors.border.default}`,
          boxShadow: `0 -10px 40px rgba(0, 0, 0, 0.3)`,
        }}
      >
        <DrawerHeader style={{ borderBottom: `1px solid ${colors.border.default}` }} className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" style={{ color: colors.text.accent }} />
              <DrawerTitle style={{ color: colors.text.primary }}>Signal Alerts</DrawerTitle>
              {notifications.length > 0 && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: colors.accent.primary,
                    color: 'white'
                  }}
                >
                  {notifications.length}
                </span>
              )}
            </div>
            <DrawerClose asChild>
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
                style={{
                  background: colors.bg.surface,
                  color: colors.text.secondary,
                }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        
        <div className="p-4 space-y-2 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: colors.bg.surface,
                  color: colors.text.tertiary
                }}
              >
                <Bell className="w-8 h-8" />
              </div>
              <p className="text-center font-medium" style={{ color: colors.text.secondary }}>
                No recent alerts
              </p>
              <p className="text-center text-sm" style={{ color: colors.text.tertiary }}>
                You'll see signal updates from the last 24 hours here
              </p>
            </div>
          ) : (
            notifications.map((notification: any) => (
              <div
                key={`${notification.id}-${notification.timestamp.getTime()}`}
                className="w-full min-h-16 px-4 py-3 flex items-start gap-3 rounded-lg transition-all duration-200 hover:bg-white/5"
                style={{
                  background: 'transparent',
                  borderLeft: `3px solid ${getNotificationColor(notification.type)}`,
                  paddingLeft: 'calc(1rem - 3px)',
                }}
              >
                <div 
                  className="mt-0.5"
                  style={{ color: getNotificationColor(notification.type) }}
                >
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium mb-1" style={{ color: colors.text.primary }}>
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: colors.text.tertiary }}>
                    <span>{notification.educatorName}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                  </div>
                </div>

                {notification.tradeType && (
                  <div className="flex items-center gap-1">
                    {notification.tradeType.includes('buy') ? (
                      <TrendingUp 
                        className="w-4 h-4" 
                        style={{ color: colors.accent.green }}
                      />
                    ) : (
                      <TrendingDown 
                        className="w-4 h-4" 
                        style={{ color: colors.accent.danger }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
