import React, { useEffect } from "react";
import { useOneSignal } from "@/hooks/useOneSignal";

const OneSignalInitializer: React.FC = () => {
  const { initialized } = useOneSignal();

  useEffect(() => {
    // Optionally, you could auto-request permission on first dashboard load.
    // We keep it passive to avoid intrusive prompts.
  }, [initialized]);

  return null;
};

export default OneSignalInitializer;
