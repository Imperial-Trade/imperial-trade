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
   * Comprehensive token validation with enhanced debugging and recovery
   */
  static async validateRecoveryTokens(): Promise<TokenValidationResult> {
    console.log('🔐 === PRODUCTION PASSWORD RESET TOKEN INVESTIGATION ===');
    console.log('🌐 Current URL:', window.location.href);
    console.log('📍 URL Hash:', window.location.hash);
    console.log('📍 URL Search:', window.location.search);
    console.log('🕰️ Current Time:', new Date().toISOString());
    
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
      // Phase 1: Enhanced URL Parameter Extraction with debugging
      console.log('📍 Phase 1: Enhanced token extraction with debugging...');
      const tokens = this.extractTokensFromUrl();
      
      if (!tokens) {
        console.log('🔄 Primary extraction failed, attempting recovery strategies...');
        
        // Strategy 1: Check backup storage
        const backupTokens = this.tryRecoverTokensFromStorage();
        if (backupTokens) {
          console.log('✅ Recovered tokens from backup storage');
          return this.validateRecoveredTokens(backupTokens, result);
        }
        
        // Strategy 2: Check for existing recovery session
        const sessionRecovery = await this.trySessionRecovery();
        if (sessionRecovery.success) {
          console.log('✅ Found existing recovery session');
          result.warnings.push('Using existing recovery session (tokens may have been stripped from URL)');
          result.isValid = true;
          result.metadata.recoveryMethod = 'existing_session';
          return result;
        }
        
        result.errors.push('No recovery tokens found in URL');
        result.errors.push('No backup tokens available');
        result.errors.push('No existing recovery session found');
        result.metadata.debugInfo = this.generateDebugInfo();
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
   * Enhanced token extraction with multiple strategies and debugging
   */
  private static extractTokensFromUrl(): RecoveryTokens | null {
    try {
      // Try hash first (standard Supabase method)
      console.log('🔍 Attempting hash extraction...');
      const hash = window.location.hash.substring(1);
      console.log('📋 Hash content:', hash || '(empty)');

      if (hash) {
        const hashTokens = this.parseTokensFromString(hash, 'hash');
        if (hashTokens) {
          console.log('✅ Successfully extracted tokens from hash');
          this.storeTokensAsBackup(hashTokens);
          return hashTokens;
        }
      }

      // Fallback: try query parameters
      console.log('🔄 Hash extraction failed, trying query parameters...');
      const search = window.location.search.substring(1);
      console.log('📋 Query content:', search || '(empty)');
      
      if (search) {
        const queryTokens = this.parseTokensFromString(search, 'query');
        if (queryTokens) {
          console.log('✅ Successfully extracted tokens from query parameters');
          this.storeTokensAsBackup(queryTokens);
          return queryTokens;
        }
      }

      console.log('❌ No valid tokens found in URL hash or query parameters');
      return null;
    } catch (error) {
      console.error('❌ Error during token extraction:', error);
      return null;
    }
  }

  /**
   * Parse tokens from a parameter string with enhanced debugging
   */
  private static parseTokensFromString(paramString: string, source: 'hash' | 'query'): RecoveryTokens | null {
    try {
      const params = new URLSearchParams(paramString);
      const tokens: Partial<RecoveryTokens> = {};

      console.log(`🔍 Parsing parameters from ${source}:`);
      
      // Extract all relevant parameters with detailed logging
      for (const [key, value] of params.entries()) {
        console.log(`  ${key}: ${key.includes('token') ? '***REDACTED***' : value}`);
        if (['type', 'access_token', 'refresh_token', 'expires_in', 'token_type'].includes(key)) {
          (tokens as any)[key] = value;
        }
      }

      // Check required parameters with detailed feedback
      const requiredCheck = this.REQUIRED_RECOVERY_PARAMS.map(param => ({
        param,
        present: params.has(param) && params.get(param),
        value: params.get(param)
      }));

      console.log(`📊 Required parameter check for ${source}:`, requiredCheck.map(check => 
        `${check.param}: ${check.present ? '✅' : '❌'}`
      ).join(', '));

      const hasAllRequired = requiredCheck.every(check => check.present);
      if (!hasAllRequired) {
        console.log(`❌ Missing required parameters in ${source}`);
        return null;
      }

      return tokens as RecoveryTokens;
    } catch (error) {
      console.error(`❌ Error parsing tokens from ${source}:`, error);
      return null;
    }
  }

  /**
   * Store tokens in sessionStorage as backup
   */
  private static storeTokensAsBackup(tokens: RecoveryTokens): void {
    try {
      const backupData = {
        tokens,
        timestamp: Date.now(),
        url: window.location.href
      };
      sessionStorage.setItem('password_reset_tokens_backup', JSON.stringify(backupData));
      console.log('💾 Stored tokens as backup in sessionStorage');
    } catch (error) {
      console.warn('⚠️ Failed to store token backup:', error);
    }
  }

  /**
   * Try to recover tokens from sessionStorage
   */
  private static tryRecoverTokensFromStorage(): RecoveryTokens | null {
    try {
      console.log('📥 Checking sessionStorage for backup tokens...');
      const backupData = sessionStorage.getItem('password_reset_tokens_backup');
      
      if (!backupData) {
        console.log('📭 No token backup found in sessionStorage');
        return null;
      }

      const backup = JSON.parse(backupData);
      const tokens = backup.tokens;
      const timestamp = backup.timestamp;
      const originalUrl = backup.url;
      
      console.log('📥 Found token backup:', { 
        age: Math.round((Date.now() - timestamp) / 1000) + 's',
        originalUrl: originalUrl,
        hasTokens: !!(tokens?.access_token && tokens?.refresh_token)
      });

      // Validate backup age (within 1 hour)
      const backupAge = Date.now() - timestamp;
      if (backupAge > 3600000) { // 1 hour
        console.log('🕰️ Token backup too old, discarding');
        this.clearTokenBackup();
        return null;
      }

      return tokens;
    } catch (error) {
      console.error('❌ Error recovering tokens from storage:', error);
      this.clearTokenBackup();
      return null;
    }
  }

  /**
   * Try to use existing recovery session
   */
  private static async trySessionRecovery(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Checking for existing recovery session...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('❌ Session check error:', error.message);
        return { success: false, error: error.message };
      }

      if (!session || !session.user) {
        console.log('❌ No active session found');
        return { success: false, error: 'No active session' };
      }

      // Check if this is a recovery session
      const isRecoverySession = session.user.recovery_sent_at || 
                               session.user.app_metadata?.recovery_sent_at ||
                               session.user.user_metadata?.recovery_sent_at;

      console.log('🔍 Session analysis:', {
        hasUser: !!session.user,
        userId: session.user.id,
        isRecovery: !!isRecoverySession,
        email: session.user.email
      });

      if (isRecoverySession) {
        console.log('✅ Found valid recovery session');
        return { success: true };
      }

      console.log('⚠️ Found session but not a recovery session');
      return { success: false, error: 'Session is not a recovery session' };
    } catch (error) {
      console.error('❌ Session recovery check failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Validate recovered tokens using standard flow
   */
  private static async validateRecoveredTokens(tokens: RecoveryTokens, result: TokenValidationResult): Promise<TokenValidationResult> {
    console.log('🔄 Validating recovered tokens using standard flow...');
    
    result.tokenType = tokens.type;
    result.accessToken = tokens.access_token;
    result.refreshToken = tokens.refresh_token;
    result.metadata.rawTokens = tokens;
    result.warnings.push('Tokens recovered from backup storage');

    // Continue with standard validation phases
    const structureValidation = this.validateTokenStructure(tokens);
    result.errors.push(...structureValidation.errors);
    result.warnings.push(...structureValidation.warnings);

    if (structureValidation.isValid) {
      const freshnessValidation = this.validateTokenFreshness(tokens);
      result.errors.push(...freshnessValidation.errors);
      result.warnings.push(...freshnessValidation.warnings);
      result.expiresAt = freshnessValidation.expiresAt;

      if (freshnessValidation.isValid) {
        const domainValidation = this.validateTokenDomain();
        result.errors.push(...domainValidation.errors);
        result.warnings.push(...domainValidation.warnings);

        if (domainValidation.isValid) {
          const sessionValidation = await this.validateSessionIntegrity(tokens);
          result.errors.push(...sessionValidation.errors);
          result.warnings.push(...sessionValidation.warnings);
          result.metadata.sessionData = sessionValidation.sessionData;

          result.isValid = sessionValidation.isValid;
        }
      }
    }

    return result;
  }

  /**
   * Generate comprehensive debug information
   */
  private static generateDebugInfo(): Record<string, any> {
    return {
      url: {
        full: window.location.href,
        hash: window.location.hash,
        search: window.location.search,
        pathname: window.location.pathname,
        hostname: window.location.hostname
      },
      storage: {
        hasBackup: !!sessionStorage.getItem('password_reset_tokens_backup'),
        sessionStorageKeys: Object.keys(sessionStorage)
      },
      timing: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      }
    };
  }

  /**
   * Clear token backup from storage
   */
  private static clearTokenBackup(): void {
    try {
      sessionStorage.removeItem('password_reset_tokens_backup');
      console.log('🧹 Cleared token backup from storage');
    } catch (error) {
      console.warn('⚠️ Failed to clear token backup:', error);
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