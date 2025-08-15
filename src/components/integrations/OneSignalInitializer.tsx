import React from "react";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

const OneSignalInitializer: React.FC = () => {
  return (
    <NotificationsProvider>
      <></>
    </NotificationsProvider>
  );
};

export default OneSignalInitializer;
