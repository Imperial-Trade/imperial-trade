interface SecurityEvent {
  type:
    | "auth_success"
    | "auth_failure"
    | "account_creation"
    | "suspicious_activity";
  userId?: string;
  email?: string;
  timestamp: Date;
  details: Record<string, any>;
  ipAddress?: string;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000;

  logEvent(event: Omit<SecurityEvent, "timestamp">) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
    };

    this.events.push(securityEvent);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to logger for debugging
    logger.log("Security Event:", securityEvent);

    // Check for suspicious patterns
    this.checkSuspiciousActivity(event);
  }

  private getClientIP(): string {
    // This is a placeholder - in production you'd get the real IP
    return "unknown";
  }

  private checkSuspiciousActivity(event: Omit<SecurityEvent, "timestamp">) {
    const recentEvents = this.events.filter(
      (e) => Date.now() - e.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    // Check for rapid failed login attempts
    const failedAttempts = recentEvents.filter(
      (e) => e.type === "auth_failure" && e.email === event.email
    );

    if (failedAttempts.length >= 3) {
      this.logEvent({
        type: "suspicious_activity",
        email: event.email,
        details: {
          pattern: "rapid_failed_logins",
          count: failedAttempts.length,
          timeframe: "5_minutes",
        },
      });
    }

    // Check for multiple account creation attempts
    const creationAttempts = recentEvents.filter(
      (e) => e.type === "account_creation"
    );

    if (creationAttempts.length >= 5) {
      this.logEvent({
        type: "suspicious_activity",
        details: {
          pattern: "rapid_account_creation",
          count: creationAttempts.length,
          timeframe: "5_minutes",
        },
      });
    }
  }

  getRecentEvents(limit = 50): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  getSuspiciousActivity(): SecurityEvent[] {
    return this.events.filter((e) => e.type === "suspicious_activity");
  }
}

export const securityMonitor = new SecurityMonitor();

// Helper functions for easy logging
export const logAuthSuccess = (userId: string, email: string) => {
  securityMonitor.logEvent({
    type: "auth_success",
    userId,
    email,
    details: { method: "password" },
  });
};

export const logAuthFailure = (email: string, reason: string) => {
  securityMonitor.logEvent({
    type: "auth_failure",
    email,
    details: { reason },
  });
};

export const logAccountCreation = (userId: string, email: string) => {
  securityMonitor.logEvent({
    type: "account_creation",
    userId,
    email,
    details: { method: "password_setup" },
  });
};
