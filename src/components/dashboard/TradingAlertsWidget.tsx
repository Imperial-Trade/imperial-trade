/**
 * Trading Alerts Widget - Shows notification status and recovery button
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { NotificationRecoveryButton } from '@/components/notifications/NotificationRecoveryButton';
import { useAuth } from '@/contexts/AuthContext';
import { useOneSignalRecovery } from '@/hooks/useOneSignalRecovery';

export const TradingAlertsWidget: React.FC = () => {
  const { profile } = useAuth();
  const { needsRecovery, subscriptionActive } = useOneSignalRecovery();

  const getStatusInfo = () => {
    if (subscriptionActive) {
      return {
        icon: CheckCircle,
        text: 'Trading Alerts Active',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200'
      };
    }

    if (needsRecovery) {
      return {
        icon: AlertTriangle,
        text: 'Setup Required',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    return {
      icon: Bell,
      text: 'Ready to Setup',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <Card className={`${status.bgColor} ${status.borderColor} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <Zap className="w-5 h-5 text-primary" />
          <span>Xeon Stream Alerts</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
            <span className="text-sm font-medium">{status.text}</span>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {profile?.user_type?.toUpperCase() || 'MEMBER'}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          {subscriptionActive ? (
            <>✅ Receiving critical trading alerts</>
          ) : (
            <>🎯 Enable instant notifications for stop loss hits, take profit levels, and new signals</>
          )}
        </div>

        <NotificationRecoveryButton 
          variant="default" 
          size="sm" 
          showStatus={false}
        />
      </CardContent>
    </Card>
  );
};