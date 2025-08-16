/**
 * Alerts Status Card - Shows notification status in Signal Stream
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationRecoveryButton } from '@/components/notifications/NotificationRecoveryButton';
import { TradingAlertsWidget } from '@/components/dashboard/TradingAlertsWidget';

export const AlertsStatusCard: React.FC = () => {
  return (
    <div className="mb-6">
      <TradingAlertsWidget />
    </div>
  );
};