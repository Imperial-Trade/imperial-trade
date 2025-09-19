/**
 * Enhanced Session Management and Validation System
 * Provides robust session state verification and recovery mechanisms
 */

import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export interface SessionValidationResult {
  isValid: boolean;
  session: Session | null;
  user: User | null;
  isRecoverySession: boolean;
  canResetPassword: boolean;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

export interface SessionHealthCheck {
  hasActiveSession: boolean;
  sessionAge: number;
  tokenExpiry: number | null;
  userStatus: string;
  needsRefresh: boolean;
  isExpired: boolean;
}

export class SessionValidator {
  private static readonly SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds
  private static readonly SESSION_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Comprehensive session validation for password recovery
   */
  static async validateRecoverySession(): Promise<SessionValidationResult> {
    const result: SessionValidationResult = {
      isValid: false,
      session: null,
      user: null,
      isRecoverySession: false,
      canResetPassword: false,
      errors: [],
      warnings: [],
      metadata: {}
    };

    try {
      console.log('🔍 Starting recovery session validation...');

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        result.errors.push(`Session retrieval failed: ${sessionError.message}`);
        return result;
      }

      result.session = session;
      result.user = session?.user || null;

      // If no session exists, check if we're in the process of establishing one
      if (!session) {
        result.warnings.push('No active session found');
        
        // Check if we have recovery tokens in URL that haven't been processed yet
        const hasTokens = this.checkForUnprocessedTokens();
        if (hasTokens) {
          result.warnings.push('Recovery tokens present but not yet processed');
          result.metadata.hasUnprocessedTokens = true;
        }
        
        return result;
      }

      // Validate session health
      const healthCheck = await this.performSessionHealthCheck(session);
      result.metadata.healthCheck = healthCheck;

      if (!healthCheck.hasActiveSession) {
        result.errors.push('Session is not active or healthy');
        return result;
      }

      if (healthCheck.isExpired) {
        result.errors.push('Session has expired');
        return result;
      }

      if (healthCheck.needsRefresh) {
        result.warnings.push('Session needs refresh');
      }

      // Check if this is specifically a recovery session
      result.isRecoverySession = this.isRecoverySession(session);
      
      // Validate user can reset password
      result.canResetPassword = this.canUserResetPassword(session.user);

      if (!result.canResetPassword) {
        result.errors.push('User is not authorized to reset password in current state');
      }

      // Cross-validate with stored session data
      const crossValidation = await this.crossValidateSession(session);
      if (!crossValidation.isValid) {
        result.warnings.push(...crossValidation.warnings);
        result.errors.push(...crossValidation.errors);
      }

      result.isValid = result.errors.length === 0 && result.canResetPassword;

      console.log('✅ Recovery session validation complete:', {
        isValid: result.isValid,
        isRecoverySession: result.isRecoverySession,
        canResetPassword: result.canResetPassword,
        errorCount: result.errors.length
      });

      return result;

    } catch (error) {
      result.errors.push(`Session validation exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ Session validation failed:', error);
      return result;
    }
  }

  /**
   * Perform comprehensive session health check
   */
  static async performSessionHealthCheck(session: Session): Promise<SessionHealthCheck> {
    const now = Date.now();
    const sessionCreated = new Date(session.user.created_at || 0).getTime();
    const sessionAge = now - sessionCreated;
    
    let tokenExpiry: number | null = null;
    let isExpired = false;
    let needsRefresh = false;

    try {
      // Parse JWT to get expiry
      if (session.access_token) {
        const payload = this.parseJWTPayload(session.access_token);
        if (payload?.exp) {
          tokenExpiry = payload.exp * 1000; // Convert to milliseconds
          isExpired = now >= tokenExpiry;
          needsRefresh = tokenExpiry - now < this.SESSION_REFRESH_THRESHOLD;
        }
      }
    } catch (error) {
      console.warn('Could not parse token expiry:', error);
    }

    return {
      hasActiveSession: !!session && !!session.user,
      sessionAge,
      tokenExpiry,
      userStatus: session.user?.user_metadata?.status || 'unknown',
      needsRefresh,
      isExpired
    };
  }

  /**
   * Check if current session is specifically a recovery session
   */
  private static isRecoverySession(session: Session): boolean {
    try {
      // Check various indicators of a recovery session
      const user = session.user;
      
      // Check if recovery was recently sent
      if (user.recovery_sent_at) {
        const recoverySentAt = new Date(user.recovery_sent_at).getTime();
        const now = Date.now();
        const timeSinceRecovery = now - recoverySentAt;
        
        // Recovery is recent (within 1 hour)
        if (timeSinceRecovery < this.SESSION_TIMEOUT) {
          return true;
        }
      }

      // Check user metadata for recovery indicators
      const userMetadata = user.user_metadata || {};
      if (userMetadata.recovery_mode === true) {
        return true;
      }

      // Check app metadata
      const appMetadata = user.app_metadata || {};
      if (appMetadata.recovery_session === true) {
        return true;
      }

      // Check if URL still has recovery type (fallback)
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      return urlParams.get('type') === 'recovery';

    } catch (error) {
      console.warn('Could not determine if recovery session:', error);
      return false;
    }
  }

  /**
   * Check if user can reset password in current state
   */
  private static canUserResetPassword(user: User): boolean {
    try {
      // Basic user validation
      if (!user || !user.email) {
        return false;
      }

      // Check if email is verified (for recovery, this should be true)
      if (!user.email_confirmed_at) {
        console.warn('User email not confirmed, but allowing for recovery flow');
        // Allow recovery even if email not confirmed, as recovery implies email access
      }

      // Check if user is not banned or suspended
      const userMetadata = user.user_metadata || {};
      const appMetadata = user.app_metadata || {};

      if (userMetadata.banned === true || appMetadata.banned === true) {
        return false;
      }

      if (userMetadata.suspended === true || appMetadata.suspended === true) {
        return false;
      }

      // Check last password update (prevent too frequent changes)
      if (user.updated_at) {
        const lastUpdate = new Date(user.updated_at).getTime();
        const now = Date.now();
        const timeSinceUpdate = now - lastUpdate;
        
        // Allow password reset if more than 1 minute since last update
        if (timeSinceUpdate < 60 * 1000) {
          console.warn('Password was updated very recently');
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('Error checking password reset permission:', error);
      return false;
    }
  }

  /**
   * Cross-validate session with stored data
   */
  private static async crossValidateSession(session: Session): Promise<{ 
    isValid: boolean; 
    errors: string[]; 
    warnings: string[] 
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Verify session with Supabase again
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        errors.push(`Cross-validation failed: ${error.message}`);
        return { isValid: false, errors, warnings };
      }

      if (!currentSession) {
        errors.push('Session became invalid during validation');
        return { isValid: false, errors, warnings };
      }

      // Compare session tokens
      if (currentSession.access_token !== session.access_token) {
        warnings.push('Session tokens do not match');
      }

      // Compare user IDs
      if (currentSession.user.id !== session.user.id) {
        errors.push('User ID mismatch in session validation');
        return { isValid: false, errors, warnings };
      }

      return { isValid: true, errors, warnings };

    } catch (error) {
      errors.push(`Cross-validation exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Check for unprocessed recovery tokens in URL
   */
  private static checkForUnprocessedTokens(): boolean {
    try {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      
      return params.get('type') === 'recovery' && 
             !!params.get('access_token') && 
             !!params.get('refresh_token');
    } catch (error) {
      return false;
    }
  }

  /**
   * Helper method to parse JWT payload
   */
  private static parseJWTPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh session if needed
   */
  static async refreshSessionIfNeeded(): Promise<{ success: boolean; session: Session | null; error?: string }> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        return { success: false, session: null, error: error.message };
      }

      return { success: true, session: data.session };

    } catch (error) {
      return { 
        success: false, 
        session: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Safely invalidate recovery session after password reset
   */
  static async invalidateRecoverySession(): Promise<{ success: boolean; error?: string }> {
    try {
      // Sign out to clear the recovery session
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}