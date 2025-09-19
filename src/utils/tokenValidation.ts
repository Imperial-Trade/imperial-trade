/**
 * Robust Token Validation System for Password Recovery
 * Implements comprehensive token validation, integrity checks, and security measures
 */

import { supabase } from '@/integrations/supabase/client';

export interface TokenValidationResult {
  isValid: boolean;
  tokenType: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

export interface RecoveryTokens {
  type: string;
  access_token: string;
  refresh_token: string;
  expires_in: string;
  token_type: string;
  expires_at?: string;
}

export class TokenValidator {
  private static readonly REQUIRED_RECOVERY_PARAMS = ['type', 'access_token', 'refresh_token'];
  private static readonly TOKEN_EXPIRY_BUFFER = 60; // 60 seconds buffer for token expiry
  private static readonly MAX_TOKEN_AGE = 24 * 60 * 60; // 24 hours max token age

  /**
   * Comprehensive token validation with integrity and security checks
   */
  static async validateRecoveryTokens(): Promise<TokenValidationResult> {
    const result: TokenValidationResult = {
      isValid: false,
      tokenType: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      errors: [],
      warnings: [],
      metadata: {}
    };

    try {
      // Phase 1: URL Parameter Extraction and Basic Validation
      const tokens = this.extractTokensFromUrl();
      if (!tokens) {
        result.errors.push('No recovery tokens found in URL');
        return result;
      }

      result.tokenType = tokens.type;
      result.accessToken = tokens.access_token;
      result.refreshToken = tokens.refresh_token;
      result.metadata.rawTokens = tokens;

      // Phase 2: Token Structure and Format Validation
      const structureValidation = this.validateTokenStructure(tokens);
      if (!structureValidation.isValid) {
        result.errors.push(...structureValidation.errors);
        result.warnings.push(...structureValidation.warnings);
      }

      // Phase 3: Token Freshness and Expiry Validation
      const freshnessValidation = this.validateTokenFreshness(tokens);
      if (!freshnessValidation.isValid) {
        result.errors.push(...freshnessValidation.errors);
        result.warnings.push(...freshnessValidation.warnings);
      }
      result.expiresAt = freshnessValidation.expiresAt;

      // Phase 4: Domain and Source Validation
      const domainValidation = this.validateTokenDomain();
      if (!domainValidation.isValid) {
        result.errors.push(...domainValidation.errors);
        result.warnings.push(...domainValidation.warnings);
      }

      // Phase 5: Supabase Session Integrity Validation
      if (result.errors.length === 0) {
        const sessionValidation = await this.validateSessionIntegrity(tokens);
        if (!sessionValidation.isValid) {
          result.errors.push(...sessionValidation.errors);
          result.warnings.push(...sessionValidation.warnings);
        }
        result.metadata.sessionData = sessionValidation.sessionData;
      }

      // Final validation result
      result.isValid = result.errors.length === 0;

      console.log('🔍 Token Validation Complete:', {
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        tokenType: result.tokenType
      });

      return result;

    } catch (error) {
      result.errors.push(`Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ Token validation exception:', error);
      return result;
    }
  }

  /**
   * Extract and parse tokens from URL hash parameters
   */
  private static extractTokensFromUrl(): RecoveryTokens | null {
    try {
      const hash = window.location.hash.substring(1);
      if (!hash) return null;

      const params = new URLSearchParams(hash);
      const tokens: Partial<RecoveryTokens> = {};

      // Extract all relevant parameters
      for (const [key, value] of params.entries()) {
        if (['type', 'access_token', 'refresh_token', 'expires_in', 'token_type'].includes(key)) {
          (tokens as any)[key] = value;
        }
      }

      // Check if we have minimum required parameters
      const hasRequiredParams = this.REQUIRED_RECOVERY_PARAMS.every(param => 
        params.has(param) && params.get(param)
      );

      if (!hasRequiredParams) return null;

      return tokens as RecoveryTokens;
    } catch (error) {
      console.error('❌ Failed to extract tokens from URL:', error);
      return null;
    }
  }

  /**
   * Validate token structure and format
   */
  private static validateTokenStructure(tokens: RecoveryTokens): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate recovery type
    if (tokens.type !== 'recovery') {
      errors.push(`Invalid token type: ${tokens.type}. Expected 'recovery'.`);
    }

    // Validate access token format (JWT structure)
    if (!this.isValidJWTFormat(tokens.access_token)) {
      errors.push('Access token does not have valid JWT format');
    }

    // Validate refresh token presence and basic format
    if (!tokens.refresh_token || tokens.refresh_token.length < 40) {
      errors.push('Refresh token is missing or too short');
    }

    // Validate expires_in parameter
    if (tokens.expires_in) {
      const expiresIn = parseInt(tokens.expires_in);
      if (isNaN(expiresIn) || expiresIn <= 0) {
        warnings.push('Invalid expires_in value');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate token freshness and expiry
   */
  private static validateTokenFreshness(tokens: RecoveryTokens): { 
    isValid: boolean; 
    errors: string[]; 
    warnings: string[]; 
    expiresAt: number | null 
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let expiresAt: number | null = null;

    try {
      // Calculate expiry time
      const now = Math.floor(Date.now() / 1000);
      
      if (tokens.expires_in) {
        const expiresInSeconds = parseInt(tokens.expires_in);
        expiresAt = now + expiresInSeconds;

        // Check if token is expired (with buffer)
        if (expiresInSeconds <= this.TOKEN_EXPIRY_BUFFER) {
          errors.push('Token has expired or will expire very soon');
        } else if (expiresInSeconds < 300) { // 5 minutes
          warnings.push('Token will expire soon, please complete the process quickly');
        }

        // Check if token age is reasonable
        if (expiresInSeconds > this.MAX_TOKEN_AGE) {
          warnings.push('Token has unusually long expiry time');
        }
      }

      // Check JWT payload for expiry (if accessible)
      try {
        const payload = this.parseJWTPayload(tokens.access_token);
        if (payload?.exp) {
          const jwtExpiresAt = payload.exp;
          if (jwtExpiresAt <= now + this.TOKEN_EXPIRY_BUFFER) {
            errors.push('JWT access token has expired');
          }
          expiresAt = jwtExpiresAt;
        }
      } catch (jwtError) {
        warnings.push('Could not parse JWT expiry time');
      }

    } catch (error) {
      warnings.push('Could not validate token freshness');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      expiresAt
    };
  }

  /**
   * Validate token domain and source
   */
  private static validateTokenDomain(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const currentDomain = window.location.hostname;
      const referrer = document.referrer;

      // Check for domain mismatches
      if (referrer && !referrer.includes(currentDomain)) {
        const referrerDomain = new URL(referrer).hostname;
        if (referrerDomain !== currentDomain && 
            !referrerDomain.includes('supabase.co') &&
            !referrerDomain.includes('tradeimperial.com')) {
          warnings.push(`Token originated from different domain: ${referrerDomain}`);
        }
      }

      // Validate current domain is expected
      const allowedDomains = [
        'localhost',
        'lovableproject.com', 
        'tradeimperial.com',
        '127.0.0.1'
      ];

      const isDomainAllowed = allowedDomains.some(domain => 
        currentDomain === domain || currentDomain.includes(domain)
      );

      if (!isDomainAllowed) {
        warnings.push(`Unexpected domain: ${currentDomain}`);
      }

    } catch (error) {
      warnings.push('Could not validate token domain');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate session integrity with Supabase
   */
  private static async validateSessionIntegrity(tokens: RecoveryTokens): Promise<{ 
    isValid: boolean; 
    errors: string[]; 
    warnings: string[]; 
    sessionData?: any 
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sessionData: any = null;

    try {
      // Attempt to get current session to verify token validity
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        errors.push(`Session validation failed: ${error.message}`);
        return { isValid: false, errors, warnings };
      }

      sessionData = session;

      // Verify session exists and has valid user
      if (!session) {
        warnings.push('No active session found, token may need to be processed');
        return { isValid: true, errors, warnings, sessionData };
      }

      if (!session.user) {
        errors.push('Session exists but no user found');
        return { isValid: false, errors, warnings, sessionData };
      }

      // Verify session token matches our recovery token
      if (session.access_token !== tokens.access_token) {
        warnings.push('Session token does not match recovery token');
      }

      // Verify user is in recovery state
      if (session.user.recovery_sent_at) {
        const recoverySentAt = new Date(session.user.recovery_sent_at).getTime();
        const now = Date.now();
        const timeSinceRecovery = now - recoverySentAt;
        
        // Recovery should be recent (within 24 hours)
        if (timeSinceRecovery > 24 * 60 * 60 * 1000) {
          warnings.push('Recovery session is older than 24 hours');
        }
      }

      return { isValid: true, errors, warnings, sessionData };

    } catch (error) {
      errors.push(`Session integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Helper method to validate JWT format
   */
  private static isValidJWTFormat(token: string): boolean {
    if (!token) return false;
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
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
   * Quick validation check for basic recovery token presence
   */
  static hasRecoveryTokens(): boolean {
    try {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      return params.get('type') === 'recovery' && !!params.get('access_token');
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear recovery tokens from URL
   */
  static clearTokensFromUrl(): void {
    try {
      if (window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    } catch (error) {
      console.warn('Could not clear tokens from URL:', error);
    }
  }
}