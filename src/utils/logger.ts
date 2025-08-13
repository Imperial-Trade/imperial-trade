// src/utils/logger.ts
// Environment-aware logging utility for Imperial Trade
// Prevents sensitive data leaks in production, enables full logs in development

import { isDevelopment, isProduction } from "@/utils/environment";

interface LoggerInterface {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  critical: (message: string, ...args: any[]) => void;
}

// Sanitize sensitive data for production logs
const sanitizeArgs = (...args: any[]): any[] => {
  if (isDevelopment()) return args; // No sanitization in development

  return args.map((arg) => {
    if (typeof arg === "object" && arg !== null) {
      const sanitized = { ...arg };
      delete sanitized.email;
      delete sanitized.user_id;
      delete sanitized.session;
      delete sanitized.access_token;
      delete sanitized.refresh_token;
      return { ...sanitized, "[sanitized]": true };
    }
    return arg;
  });
};

export const logger: LoggerInterface = {
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment()) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (isDevelopment()) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment()) {
      console.warn(`[WARN] ${message}`, ...args);
    } else {
      console.warn(`[WARN] ${message}`, ...sanitizeArgs(...args));
    }
  },
  error: (message: string, ...args: any[]) => {
    if (isDevelopment()) {
      console.error(`[ERROR] ${message}`, ...args);
    } else {
      console.error(`[ERROR] ${message}`, ...sanitizeArgs(...args));
    }
  },
  critical: (message: string, ...args: any[]) => {
    // Always show, always sanitize in production
    console.error(`[CRITICAL] ${message}`, ...sanitizeArgs(...args));
  },
};

// Legacy console replacement for gradual migration
export const devLog = (message: string, ...args: any[]) => {
  if (isDevelopment()) {
    console.log(message, ...args);
  }
};
