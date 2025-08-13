import { supabase } from '@/integrations/supabase/client';

interface SecurityAlert {
  id: string;
  type: 'suspicious_activity' | 'failed_login' | 'unauthorized_access' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  userEmail?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

interface SessionInfo {
  userId: string;
  email: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

class AdminSecurityService {
  private static instance: AdminSecurityService;
  private alerts: SecurityAlert[] = [];
  private activeSessions: Map<string, SessionInfo> = new Map();
  private failedAttempts: Map<string, number> = new Map();
  private maxFailedAttempts = 3;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.startSessionMonitoring();
  }

  static getInstance(): AdminSecurityService {
    if (!AdminSecurityService.instance) {
      AdminSecurityService.instance = new AdminSecurityService();
    }
    return AdminSecurityService.instance;
  }

  logSecurityAlert(
    type: SecurityAlert['type'],
    severity: SecurityAlert['severity'],
    message: string,
    metadata?: Record<string, any>
  ) {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      type,
      severity,
      message,
      timestamp: new Date(),
      metadata
    };

    this.alerts.push(alert);
    console.warn(`Security Alert [${severity.toUpperCase()}]:`, message, metadata);

    // Keep only recent alerts (last 1000)
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  trackFailedLogin(email: string) {
    const attempts = (this.failedAttempts.get(email) || 0) + 1;
    this.failedAttempts.set(email, attempts);

    if (attempts >= this.maxFailedAttempts) {
      this.logSecurityAlert(
        'failed_login',
        'high',
        `Multiple failed login attempts for ${email}`,
        { attempts, email }
      );
    }
  }

  clearFailedAttempts(email: string) {
    this.failedAttempts.delete(email);
  }

  isAccountLocked(email: string): boolean {
    return (this.failedAttempts.get(email) || 0) >= this.maxFailedAttempts;
  }

  trackAdminSession(userId: string, email: string) {
    const session: SessionInfo = {
      userId,
      email,
      loginTime: new Date(),
      lastActivity: new Date(),
      ipAddress: 'unknown', // Would need backend integration
      userAgent: navigator.userAgent
    };

    this.activeSessions.set(userId, session);
    this.logSecurityAlert(
      'suspicious_activity',
      'low',
      `Admin session started for ${email}`,
      { userId, email }
    );
  }

  updateSessionActivity(userId: string) {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  checkSessionTimeout(userId: string): boolean {
    const session = this.activeSessions.get(userId);
    if (!session) return true;

    const now = Date.now();
    const lastActivity = session.lastActivity.getTime();
    
    if (now - lastActivity > this.sessionTimeout) {
      this.endSession(userId);
      return true;
    }
    
    return false;
  }

  endSession(userId: string) {
    const session = this.activeSessions.get(userId);
    if (session) {
      this.logSecurityAlert(
        'suspicious_activity',
        'low',
        `Admin session ended for ${session.email}`,
        { userId, sessionDuration: Date.now() - session.loginTime.getTime() }
      );
    }
    this.activeSessions.delete(userId);
  }

  getSecurityAlerts(limit = 50): SecurityAlert[] {
    return this.alerts.slice(-limit).reverse();
  }

  getActiveSessions(): SessionInfo[] {
    return Array.from(this.activeSessions.values());
  }

  private startSessionMonitoring() {
    setInterval(() => {
      for (const [userId] of this.activeSessions) {
        this.checkSessionTimeout(userId);
      }
    }, 60000); // Check every minute
  }

  // Enhanced admin access validation
  async validateAdminAccess(userId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user || user.user.id !== userId) {
        this.logSecurityAlert(
          'unauthorized_access',
          'high',
          'Unauthorized admin access attempt',
          { userId }
        );
        return false;
      }

      const userRole = user.user.user_metadata?.access_level;
      if (userRole !== 'admin') {
        this.logSecurityAlert(
          'unauthorized_access',
          'high',
          'Non-admin user attempting admin access',
          { userId, userRole }
        );
        return false;
      }

      // Check for session timeout
      if (this.checkSessionTimeout(userId)) {
        return false;
      }

      // Update session activity
      this.updateSessionActivity(userId);
      
      return true;
    } catch (error) {
      this.logSecurityAlert(
        'unauthorized_access',
        'critical',
        'Error validating admin access',
        { userId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
      return false;
    }
  }
}

export const adminSecurity = AdminSecurityService.getInstance();
