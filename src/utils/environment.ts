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

export const getOrderFlowAppUrl = (): string => {
  return "https://www.tradeimperial.com/orderflow";
};

export const getAcademyAppUrl = (): string => {
  return "https://www.tradeimperial.com/academy";
};
