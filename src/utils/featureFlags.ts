// Feature flag utilities for controlling developer tools and debug features

export const isDevToolsEnabled = (): boolean => {
  return import.meta.env.VITE_SHOW_DEV_TOOLS === 'true';
};

export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

export const shouldShowDevFeatures = (): boolean => {
  return isDevelopment() && isDevToolsEnabled();
};

// Build information utilities
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