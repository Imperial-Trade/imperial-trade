// Utility functions for managing rate limits

export const clearLocalStorageRateLimits = () => {
  const keys = Object.keys(localStorage);
  const rateLimitKeys = keys.filter(
    (key) =>
      key.includes("rate_limit") ||
      key.includes("progressive_rate_limit") ||
      key.includes("adaptive_rate_limit")
  );

  rateLimitKeys.forEach((key) => {
    localStorage.removeItem(key);
    logger.log(`Cleared rate limit key: ${key}`);
  });

  logger.log(
    `Cleared ${rateLimitKeys.length} rate limit keys from localStorage`
  );
  return rateLimitKeys.length;
};

export const clearSessionStorageRateLimits = () => {
  const keys = Object.keys(sessionStorage);
  const rateLimitKeys = keys.filter(
    (key) => key.includes("rate_limit") || key.includes("session_id")
  );

  rateLimitKeys.forEach((key) => {
    sessionStorage.removeItem(key);
    logger.log(`Cleared session key: ${key}`);
  });

  logger.log(`Cleared ${rateLimitKeys.length} keys from sessionStorage`);
  return rateLimitKeys.length;
};

export const clearAllRateLimitData = () => {
  const localCleared = clearLocalStorageRateLimits();
  const sessionCleared = clearSessionStorageRateLimits();

  return {
    localStorage: localCleared,
    sessionStorage: sessionCleared,
    total: localCleared + sessionCleared,
  };
};

// Development helper - adds to window object
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).clearRateLimits = clearAllRateLimitData;
  logger.log("Rate limit utilities available: window.clearRateLimits()");
}
