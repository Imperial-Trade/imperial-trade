import React from "react";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import NotificationPermissionBanner from "@/components/notifications/NotificationPermissionBanner";

const OneSignalInitializer: React.FC = () => {
  return (
    <NotificationsProvider>
      <NotificationPermissionBanner />
    </NotificationsProvider>
  );
};

export default OneSignalInitializer;
