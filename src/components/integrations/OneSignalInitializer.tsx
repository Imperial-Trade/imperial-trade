import React from "react";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import UnifiedPermissionFlow from "@/components/notifications/UnifiedPermissionFlow";
import NotificationDebugPanel from "@/components/notifications/NotificationDebugPanel";
import OneSignalEmergencyPanel from "@/components/admin/OneSignalEmergencyPanel";
import { useAuth } from "@/contexts/AuthContext";

const OneSignalInitializer: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.access_level === 'admin';

  return (
    <NotificationsProvider>
      <UnifiedPermissionFlow autoShow={true} />
      <NotificationDebugPanel />
      {isAdmin && <OneSignalEmergencyPanel />}
    </NotificationsProvider>
  );
};

export default OneSignalInitializer;
