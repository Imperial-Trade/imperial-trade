import React from "react";
import { FallbackNotificationsProvider } from "@/contexts/FallbackNotificationsContext";

interface OneSignalInitializerProps {
  children: React.ReactNode;
}

const OneSignalInitializer: React.FC<OneSignalInitializerProps> = ({ children }) => {
  return (
    <FallbackNotificationsProvider>
      {children}
    </FallbackNotificationsProvider>
  );
};

export default OneSignalInitializer;
