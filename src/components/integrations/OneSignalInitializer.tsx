import React from "react";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import UnifiedPermissionFlow from "@/components/notifications/UnifiedPermissionFlow";
import NotificationDebugPanel from "@/components/notifications/NotificationDebugPanel";

const OneSignalInitializer: React.FC = () => {
  return (
    <NotificationsProvider>
      <UnifiedPermissionFlow autoShow={true} />
      <NotificationDebugPanel />
    </NotificationsProvider>
  );
};

export default OneSignalInitializer;
