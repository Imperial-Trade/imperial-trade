/**
 * Recovery Flow Security Enhancement
 * Implements security measures for the password recovery process
 */

import { TokenValidator, TokenValidationResult } from './tokenValidation';
import { SessionValidator, SessionValidationResult } from './sessionValidation';
import { supabase } from '@/integrations/supabase/client';

export interface RecoveryFlowState {
  isSecure: boolean;
  flowStage: 'initial' | 'token_validation' | 'session_established' | 'ready_for_reset' | 'completed' | 'failed';
  tokenValidation: TokenValidationResult | null;
  sessionValidation: SessionValidationResult | null;
  securityScore: number;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

export interface RecoveryFlowConfig {
  requireStrictValidation: boolean;
  allowExpiredTokensWithWarning: boolean;
  enableDomainValidation: boolean;
  enableSessionPersistence: boolean;
  maxRetryAttempts: number;
  securityScoreThreshold: number;
}

export class RecoveryFlowSecurity {
  private static readonly DEFAULT_CONFIG: RecoveryFlowConfig = {
    requireStrictValidation: true,
    allowExpiredTokensWithWarning: false,
    enableDomainValidation: true,
    enableSessionPersistence: true,
    maxRetryAttempts: 3,
    securityScoreThreshold: 75
  };

  private static retryCount = 0;
  private static flowState: RecoveryFlowState | null = null;

  /**
   * Enhanced recovery flow initialization with comprehensive debugging
   */
  static async initializeRecoveryFlow(config: Partial<RecoveryFlowConfig> = {}): Promise<RecoveryFlowState> {
    const flowConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    const state: RecoveryFlowState = {
      isSecure: false,
      flowStage: 'initial',
      tokenValidation: null,
      sessionValidation: null,
      securityScore: 0,
      errors: [],
      warnings: [],
      metadata: {
        config: flowConfig,
        startTime: Date.now(),
        retryCount: this.retryCount,
        investigation: {
          url: window.location.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      }
    };

    try {
      console.log('🔐 === ENHANCED RECOVERY FLOW INITIALIZATION ===');
      console.log('🔧 Flow config:', flowConfig);
      console.log('🌐 Current environment:', {
        url: window.location.href,
        hash: window.location.hash,
        search: window.location.search
      });

      // Stage 1: Enhanced Token Validation with Recovery Strategies
      console.log('📍 Stage 1: Enhanced token validation...');
      state.flowStage = 'token_validation';
      const tokenValidation = await TokenValidator.validateRecoveryTokens();
      state.tokenValidation = tokenValidation;

      console.log('📊 Token validation results:', {
        isValid: tokenValidation.isValid,
        errorCount: tokenValidation.errors.length,
        warningCount: tokenValidation.warnings.length,
        recoveryMethod: tokenValidation.metadata.recoveryMethod
      });

      if (!tokenValidation.isValid) {
        console.log('⚠️ Token validation failed, attempting enhanced recovery...');
        state.errors.push('Primary token validation failed');
        state.errors.push(...tokenValidation.errors);
        state.warnings.push(...tokenValidation.warnings);
        
        // Enhanced recovery attempts
        const enhancedRecovery = await this.attemptEnhancedRecovery(flowConfig);
        if (enhancedRecovery.success) {
          console.log('✅ Enhanced recovery successful');
          state.warnings.push(`Recovery successful: ${enhancedRecovery.method}`);
          // Re-validate with recovered session
          const revalidation = await TokenValidator.validateRecoveryTokens();
          state.tokenValidation = revalidation;
        } else {
          console.log('❌ All recovery attempts failed:', enhancedRecovery.error);
          
          if (!this.shouldRetry(flowConfig)) {
            state.flowStage = 'failed';
            state.errors.push('Maximum recovery attempts exceeded');
            this.flowState = state;
            return state;
          }
        }
      }

      // Stage 2: Session Validation
      state.flowStage = 'session_established';
      const sessionValidation = await SessionValidator.validateRecoverySession();
      state.sessionValidation = sessionValidation;

      if (!sessionValidation.isValid) {
        state.errors.push('Session validation failed');
        state.errors.push(...sessionValidation.errors);
        state.warnings.push(...sessionValidation.warnings);

        // Attempt session recovery if possible
        const recoveryAttempt = await this.attemptSessionRecovery(tokenValidation);
        if (recoveryAttempt.success) {
          state.warnings.push('Session recovered successfully');
          // Re-validate session after recovery
          const revalidatedSession = await SessionValidator.validateRecoverySession();
          state.sessionValidation = revalidatedSession;
        } else {
          state.errors.push(`Session recovery failed: ${recoveryAttempt.error}`);
        }
      }

      // Stage 3: Security Score Calculation
      state.securityScore = this.calculateSecurityScore(tokenValidation, sessionValidation, flowConfig);
      state.metadata.securityBreakdown = this.getSecurityScoreBreakdown(tokenValidation, sessionValidation);

      // Stage 4: Final Security Assessment
      if (state.securityScore >= flowConfig.securityScoreThreshold && 
          (tokenValidation.isValid || flowConfig.allowExpiredTokensWithWarning) &&
          sessionValidation.isValid) {
        state.flowStage = 'ready_for_reset';
        state.isSecure = true;
        console.log('✅ Recovery flow is secure and ready');
      } else {
        state.flowStage = 'failed';
        state.errors.push(`Security score ${state.securityScore} below threshold ${flowConfig.securityScoreThreshold}`);
        console.log('❌ Recovery flow security validation failed');
      }

      // Store persistent state if enabled
      if (flowConfig.enableSessionPersistence && state.isSecure) {
        await this.persistSecureFlowState(state);
      }

      this.flowState = state;
      return state;

    } catch (error) {
      state.errors.push(`Recovery flow initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      state.flowStage = 'failed';
      console.error('❌ Recovery flow initialization error:', error);
      this.flowState = state;
      return state;
    }
  }

  /**
   * Execute secure password reset
   */
  static async executeSecurePasswordReset(newPassword: string): Promise<{
    success: boolean;
    error?: string;
    warnings?: string[];
  }> {
    try {
      // Validate current flow state
      if (!this.flowState || !this.flowState.isSecure || this.flowState.flowStage !== 'ready_for_reset') {
        return {
          success: false,
          error: 'Recovery flow is not in a secure state for password reset'
        };
      }

      // Additional password strength validation
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          warnings: passwordValidation.warnings
        };
      }

      console.log('🔄 Executing secure password reset...');

      // Perform the password update
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return {
          success: false,
          error: `Password update failed: ${error.message}`
        };
      }

      // Mark flow as completed
      this.flowState.flowStage = 'completed';
      this.flowState.metadata.completedAt = Date.now();

      // Clean up recovery tokens and state
      await this.cleanupRecoveryFlow();

      console.log('✅ Password reset completed successfully');

      return {
        success: true,
        warnings: this.flowState.warnings
      };

    } catch (error) {
      console.error('❌ Password reset execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Calculate security score based on validation results
   */
  private static calculateSecurityScore(
    tokenValidation: TokenValidationResult,
    sessionValidation: SessionValidationResult,
    config: RecoveryFlowConfig
  ): number {
    let score = 0;

    // Token validation score (40 points max)
    if (tokenValidation.isValid) {
      score += 40;
    } else if (tokenValidation.tokenType === 'recovery' && config.allowExpiredTokensWithWarning) {
      score += 20; // Partial credit for correct token type
    }

    // Session validation score (30 points max)  
    if (sessionValidation.isValid) {
      score += 30;
    } else if (sessionValidation.session && sessionValidation.user) {
      score += 15; // Partial credit for having session/user
    }

    // Security measures bonus (30 points max)
    if (tokenValidation.errors.length === 0) score += 10;
    if (sessionValidation.canResetPassword) score += 10;
    if (sessionValidation.isRecoverySession) score += 10;

    // Deduct points for warnings and errors
    score -= Math.min(tokenValidation.warnings.length * 2, 10);
    score -= Math.min(sessionValidation.warnings.length * 2, 10);
    score -= Math.min(tokenValidation.errors.length * 5, 20);
    score -= Math.min(sessionValidation.errors.length * 5, 20);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get detailed security score breakdown
   */
  private static getSecurityScoreBreakdown(
    tokenValidation: TokenValidationResult,
    sessionValidation: SessionValidationResult
  ) {
    return {
      tokenValidationScore: tokenValidation.isValid ? 40 : 0,
      sessionValidationScore: sessionValidation.isValid ? 30 : 0,
      securityBonuses: {
        noTokenErrors: tokenValidation.errors.length === 0 ? 10 : 0,
        canResetPassword: sessionValidation.canResetPassword ? 10 : 0,
        isRecoverySession: sessionValidation.isRecoverySession ? 10 : 0
      },
      penalties: {
        tokenWarnings: tokenValidation.warnings.length * 2,
        sessionWarnings: sessionValidation.warnings.length * 2,
        tokenErrors: tokenValidation.errors.length * 5,
        sessionErrors: sessionValidation.errors.length * 5
      }
    };
  }

  /**
   * Enhanced recovery with multiple strategies
   */
  private static async attemptEnhancedRecovery(config: RecoveryFlowConfig): Promise<{
    success: boolean;
    method?: string;
    error?: string;
  }> {
    console.log('🔄 Attempting enhanced recovery strategies...');

    // Strategy 1: Token-based session recovery
    try {
      console.log('🔄 Strategy 1: Token-based session recovery...');
      const sessionRecovery = await this.attemptSessionRecovery(this.flowState?.tokenValidation);
      if (sessionRecovery.success) {
        return { success: true, method: 'token-based session recovery' };
      }
      console.log('❌ Token-based recovery failed:', sessionRecovery.error);
    } catch (error) {
      console.log('❌ Token-based recovery error:', error);
    }

    // Strategy 2: Existing session validation
    try {
      console.log('🔄 Strategy 2: Existing session validation...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!error && session && session.user) {
        // Check if session is recovery-related
        const isRecovery = session.user.recovery_sent_at || 
                          session.user.app_metadata?.recovery_sent_at;
        
        if (isRecovery) {
          console.log('✅ Found existing recovery session');
          return { success: true, method: 'existing recovery session' };
        }
        
        // Try refreshing session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session) {
          console.log('✅ Successfully refreshed session');
          return { success: true, method: 'session refresh' };
        }
      }
    } catch (error) {
      console.log('❌ Existing session validation error:', error);
    }

    // Strategy 3: Backup token restoration
    try {
      console.log('🔄 Strategy 3: Backup token restoration...');
      const backupData = sessionStorage.getItem('password_reset_tokens_backup');
      
      if (backupData) {
        const backup = JSON.parse(backupData);
        const tokens = backup.tokens;
        
        if (tokens && tokens.access_token && tokens.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
          });
          
          if (!error) {
            console.log('✅ Successfully restored from backup tokens');
            return { success: true, method: 'backup token restoration' };
          }
        }
      }
    } catch (error) {
      console.log('❌ Backup token restoration error:', error);
    }

    return { 
      success: false, 
      error: 'All enhanced recovery strategies failed' 
    };
  }

  /**
   * Attempt to recover session state (original method enhanced)
   */
  private static async attemptSessionRecovery(tokenValidation: TokenValidationResult | null | undefined): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🔄 Attempting session recovery with tokens...');
      
      if (!tokenValidation?.isValid || !tokenValidation?.accessToken || !tokenValidation?.refreshToken) {
        console.log('❌ No valid tokens available for session recovery');
        return { success: false, error: 'No valid tokens available for session recovery' };
      }

      // Attempt to establish session with tokens
      const { data, error } = await supabase.auth.setSession({
        access_token: tokenValidation.accessToken,
        refresh_token: tokenValidation.refreshToken
      });

      if (error) {
        console.log('❌ Session recovery failed:', error.message);
        return { success: false, error: error.message };
      }

      if (data.session && data.session.user) {
        console.log('✅ Session recovery successful');
        return { success: true };
      }

      return { success: false, error: 'Session established but no user data' };

    } catch (error) {
      console.error('❌ Session recovery exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown session recovery error' 
      };
    }
  }

  /**
   * Validate password strength
   */
  private static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      warnings.push('Password should contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      warnings.push('Password should contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      warnings.push('Password should contain at least one number');
    }

    if (!/[!@#$%^&*]/.test(password)) {
      warnings.push('Password should contain at least one special character');
    }

    if (password.length > 128) {
      errors.push('Password cannot be longer than 128 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Persist secure flow state
   */
  private static async persistSecureFlowState(state: RecoveryFlowState): Promise<void> {
    try {
      const persistData = {
        timestamp: Date.now(),
        isSecure: state.isSecure,
        flowStage: state.flowStage,
        securityScore: state.securityScore
      };

      sessionStorage.setItem('imperial_recovery_flow', JSON.stringify(persistData));
    } catch (error) {
      console.warn('Could not persist recovery flow state:', error);
    }
  }

  /**
   * Clean up recovery flow
   */
  private static async cleanupRecoveryFlow(): Promise<void> {
    try {
      // Clear tokens from URL
      TokenValidator.clearTokensFromUrl();

      // Clear persistent state
      sessionStorage.removeItem('imperial_recovery_flow');

      // Invalidate recovery session
      await SessionValidator.invalidateRecoverySession();

      // Reset retry count
      this.retryCount = 0;
      this.flowState = null;

    } catch (error) {
      console.warn('Error during recovery flow cleanup:', error);
    }
  }

  /**
   * Check if retry should be attempted
   */
  private static shouldRetry(config: RecoveryFlowConfig): boolean {
    this.retryCount++;
    return this.retryCount <= config.maxRetryAttempts;
  }

  /**
   * Get current flow state
   */
  static getCurrentFlowState(): RecoveryFlowState | null {
    return this.flowState;
  }

  /**
   * Reset recovery flow state
   */
  static resetFlowState(): void {
    this.flowState = null;
    this.retryCount = 0;
  }
}