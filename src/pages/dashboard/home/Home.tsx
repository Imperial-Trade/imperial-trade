
import React from 'react';
import { DashboardHome } from '@/components/dashboard/DashboardHome';
import { IOSPWANotificationBanner } from '@/components/notifications/IOSPWANotificationBanner';

const Home: React.FC = () => {
  return (
    <div className="space-y-4">
      <IOSPWANotificationBanner />
      <DashboardHome />
    </div>
  );
};

export default Home;
