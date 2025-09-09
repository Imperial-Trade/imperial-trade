// Feature flag utilities for controlling developer tools and debug features

/**
 * Primary feature flag for controlling all developer tools visibility.
 * Set VITE_SHOW_DEV_TOOLS=true in .env to enable developer tools.
 * This is the single source of truth for gating all internal diagnostic tools.
 */
export const isDevToolsEnabled = (): boolean => {
  return import.meta.env.VITE_SHOW_DEV_TOOLS === 'true';
};

export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

/**
 * @deprecated Use isDevToolsEnabled() instead for consistent gating
 * This function is kept for compatibility but should be replaced
 */
export const shouldShowDevFeatures = (): boolean => {
  return isDevelopment() && isDevToolsEnabled();
};

// Build information utilities
// Alias for backward compatibility with the original plan
export const showDevTools = isDevToolsEnabled;

export const getBuildInfo = () => {
  const buildDate = new Date().toISOString();
  const nodeEnv = import.meta.env.MODE;
  const isDev = isDevelopment();
  
  return {
    buildDate,
    environment: nodeEnv,
    isDevelopment: isDev,
    version: '1.0.0', // Can be populated from package.json if needed
    devToolsEnabled: isDevToolsEnabled()
  };
};