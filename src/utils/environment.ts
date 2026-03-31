/**
 * Environment utility functions for Imperial Academy
 */

export const isProduction = (): boolean => {
  // Use Vite's built-in environment detection
  return import.meta.env.PROD;
};

export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

export const getMainAppUrl = (): string => {
  return "https://www.tradeimperial.com/";
};

export const isProductionDomain = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "www.tradeimperial.com";
};

/** Standalone Orderflow app (separate dev server, e.g. localhost:8082 — not embedded in Imperial). */
export const getOrderFlowAppUrl = (): string => {
  const envUrl = import.meta.env.VITE_ORDERFLOW_URL as string | undefined;
  if (envUrl?.trim()) return envUrl.trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      return `http://${h}:8082`;
    }
  }

  return "https://www.tradeimperial.com/orderflow";
};

/**
 * Query flag for Orderflow welcome after Imperial sign-in. Full-page redirects
 * cannot carry React Router `location.state`; Orderflow reads this once and strips it.
 * Must match orderflow `IMPERIAL_WELCOME_SEARCH_PARAM` + value `1`.
 */
export const ORDERFLOW_POST_LOGIN_WELCOME_PARAM = "imperialWelcome";

export function redirectToOrderflowApp(): void {
  const base = getOrderFlowAppUrl();
  const sep = base.includes("?") ? "&" : "?";
  window.location.replace(
    `${base}${sep}${ORDERFLOW_POST_LOGIN_WELCOME_PARAM}=1`
  );
}

export const getAcademyAppUrl = (): string => {
  return "https://www.tradeimperial.com/academy";
};

/**
 * Get the correct password reset redirect URL for the current environment
 */
export const getPasswordResetUrl = (): string => {
  // Always use production URL for password reset emails
  // Point to /reset-password for dedicated password reset flow
  return "https://www.tradeimperial.com/reset-password";
};

/**
 * Get the current application base URL
 */
export const getAppBaseUrl = (): string => {
  if (isProduction() || isProductionDomain()) {
    return "https://www.tradeimperial.com";
  }
  
  // In development, still use production URL for password resets
  // but localhost for other features
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  
  // Fallback to production
  return "https://www.tradeimperial.com";
};

/**
 * Validate if we're using the correct production configuration
 */
export const validateProductionConfig = (): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  if (!isProduction() && typeof window !== "undefined") {
    const currentOrigin = window.location.origin;
    if (currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')) {
      issues.push("Development environment detected - ensure Supabase Site URL is set to production");
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};
