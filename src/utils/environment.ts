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
  // Use current origin for development, or specific Lovable URL for deployment
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Fallback for server-side rendering - use the main project's Lovable URL
  return "https://www.tradeimperial.com";
};

export const isProductionDomain = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "www.tradeimperial.com";
};

export const getOrderFlowAppUrl = (): string => {
  return "https://orderflow-social-hub.lovableproject.com";
};

export const getAcademyAppUrl = (): string => {
  return "https://market-fix-academy.lovableproject.com";
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
