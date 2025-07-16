import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePostHog } from "posthog-js/react";

const PostHogPageViewTracker = () => {
  const posthog = usePostHog();
  const location = useLocation();

  useEffect(() => {
    if (posthog) {
      posthog.capture("$pageview");
    }
  }, [location, posthog]);

  return null;
};

export default PostHogPageViewTracker;
