import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import posthog from "posthog-js";

const PostHogPageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      posthog?.capture?.("$pageview");
    } catch (e) {
      // noop: PostHog not ready
    }
  }, [location]);

  return null;
};

export default PostHogPageViewTracker;
