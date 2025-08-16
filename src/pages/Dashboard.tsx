
import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MarketOverview } from '@/components/dashboard/MarketOverview';
import { SignalsFeed } from '@/components/dashboard/SignalsFeed';
import { TopPerformers } from '@/components/dashboard/TopPerformers';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { TradingNotificationModal } from '@/components/notifications/TradingNotificationModal';
import { usePostLoginNotificationSetup } from '@/hooks/usePostLoginNotificationSetup';

const Dashboard = () => {
  const { 
    showNotificationModal, 
    handleModalClose, 
    handleNotificationEnabled 
  } = usePostLoginNotificationSetup();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your trading command center
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <MarketOverview />
          </div>
          <div className="lg:col-span-2">
            <TopPerformers />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SignalsFeed />
          <RecentActivity />
        </div>
      </div>

      <TradingNotificationModal
        isOpen={showNotificationModal}
        onClose={handleModalClose}
        onNotificationEnabled={handleNotificationEnabled}
      />
    </DashboardLayout>
  );
};

export default Dashboard;
