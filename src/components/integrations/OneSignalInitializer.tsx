import React from "react";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import UnifiedPermissionFlow from "@/components/notifications/UnifiedPermissionFlow";

const OneSignalInitializer: React.FC = () => {
  return (
    <NotificationsProvider>
      <UnifiedPermissionFlow autoShow={true} />
    </NotificationsProvider>
  );
};

export default OneSignalInitializer;
