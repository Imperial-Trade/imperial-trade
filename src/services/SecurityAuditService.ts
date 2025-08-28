
import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  event_type: 'privilege_escalation_attempt' | 'unauthorized_access' | 'role_change' | 'suspicious_activity';
  user_id?: string;
  user_email?: string;
  resource_accessed?: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class SecurityAuditService {
  private static instance: SecurityAuditService;

  private constructor() {}

  static getInstance(): SecurityAuditService {
    if (!SecurityAuditService.instance) {
      SecurityAuditService.instance = new SecurityAuditService();
    }
    return SecurityAuditService.instance;
  }

  /**
   * Log a security event for audit purposes
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          action: event.event_type,
          admin_email: event.user_email || 'system',
          target_entity: event.resource_accessed || 'system',
          target_id: event.user_id || 'unknown',
          details: {
            ...event.metadata,
            severity: event.severity,
            timestamp: new Date().toISOString()
          }
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Log unauthorized access attempts
   */
  async logUnauthorizedAccess(
    resource: string, 
    userId?: string, 
    userEmail?: string,
    attemptedAction?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'unauthorized_access',
      user_id: userId,
      user_email: userEmail,
      resource_accessed: resource,
      metadata: {
        attempted_action: attemptedAction,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      severity: 'high'
    });
  }

  /**
   * Log privilege escalation attempts
   */
  async logPrivilegeEscalationAttempt(
    userId?: string,
    userEmail?: string,
    attemptedRole?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'privilege_escalation_attempt',
      user_id: userId,
      user_email: userEmail,
      resource_accessed: 'user_roles',
      metadata: {
        attempted_role: attemptedRole,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      severity: 'critical'
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    activity: string,
    userId?: string,
    userEmail?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'suspicious_activity',
      user_id: userId,
      user_email: userEmail,
      resource_accessed: activity,
      metadata: {
        ...metadata,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      severity: 'medium'
    });
  }
}

export const securityAuditService = SecurityAuditService.getInstance();
