import React from "react";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import NotificationDebugPanel from "@/components/notifications/NotificationDebugPanel";
import OneSignalEmergencyPanel from "@/components/admin/OneSignalEmergencyPanel";
import NotificationTestingPanel from "@/components/admin/NotificationTestingPanel";
import { useAuth } from "@/contexts/AuthContext";

const OneSignalInitializer: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.access_level === 'admin';

  return (
    <NotificationsProvider>
      {/* Only OneSignal native prompt will be used - no custom UI */}
      {isAdmin && (
        <>
          <div className="fixed top-4 right-4 z-50">
            <NotificationDebugPanel />
          </div>
          <OneSignalEmergencyPanel />
          <NotificationTestingPanel />
        </>
      )}
    </NotificationsProvider>
  );
};

export default OneSignalInitializer;
