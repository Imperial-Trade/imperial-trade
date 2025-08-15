import React from "react";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

interface OneSignalInitializerProps {
  children: React.ReactNode;
}

const OneSignalInitializer: React.FC<OneSignalInitializerProps> = ({ children }) => {
  return (
    <NotificationsProvider>
      {children}
    </NotificationsProvider>
  );
};

export default OneSignalInitializer;
