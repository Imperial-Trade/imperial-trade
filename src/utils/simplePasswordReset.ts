/**
 * Simplified Password Reset System
 * Removes complex validation layers and focuses on core Supabase functionality
 */

import { supabase } from '@/integrations/supabase/client';

export interface SimpleResetResult {
  success: boolean;
  error?: string;
  warnings?: string[];
  requiresAuth?: boolean;
}

export interface ResetSession {
  isValid: boolean;
  method: 'direct_auth' | 'url_tokens' | 'fallback';
  user: any;
}

export class SimplePasswordReset {
  /**
   * Check if user can reset password - ultra-simplified approach
   */
  static async validateResetSession(): Promise<ResetSession> {
    console.log('🔐 Simple Password Reset - Session Validation');
    
    try {
      // Method 1: Check if user is already authenticated
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!error && session?.user) {
        console.log('✅ User already authenticated');
        return {
          isValid: true,
          method: 'direct_auth',
          user: session.user
        };
      }

      // Method 2: Try to extract and use tokens from URL
      const tokens = this.extractTokensFromURL();
      if (tokens) {
        console.log('🔗 Tokens found in URL, attempting authentication');
        
        try {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
          });

          if (!setSessionError) {
            const { data: { session: newSession } } = await supabase.auth.getSession();
            if (newSession?.user) {
              console.log('✅ Successfully authenticated with URL tokens');
              return {
                isValid: true,
                method: 'url_tokens',
                user: newSession.user
              };
            }
          }
        } catch (tokenError) {
          console.warn('⚠️ Token authentication failed:', tokenError);
        }
      }

      // Method 3: Fallback - if user is on reset page, allow with warning
      const isOnResetPage = window.location.pathname.includes('reset-password');
      if (isOnResetPage) {
        console.log('🔓 Fallback mode - allowing reset based on page access');
        return {
          isValid: true,
          method: 'fallback',
          user: null
        };
      }

      return {
        isValid: false,
        method: 'direct_auth',
        user: null
      };

    } catch (error) {
      console.error('❌ Session validation failed:', error);
      return {
        isValid: false,
        method: 'direct_auth', 
        user: null
      };
    }
  }

  /**
   * Execute password reset with simplified flow
   */
  static async resetPassword(newPassword: string): Promise<SimpleResetResult> {
    console.log('🔒 Simple Password Reset - Executing reset');

    try {
      // Validate password strength
      if (newPassword.length < 8) {
        return {
          success: false,
          error: 'Password must be at least 8 characters long'
        };
      }

      // Check current authentication state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session check failed:', sessionError);
        return {
          success: false,
          error: 'Unable to verify authentication status'
        };
      }

      if (!session?.user) {
        // Try to extract tokens and authenticate first
        const tokens = this.extractTokensFromURL();
        if (tokens) {
          try {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token
            });

            if (setSessionError) {
              console.error('❌ Token authentication failed:', setSessionError);
              return {
                success: false,
                error: 'Invalid or expired reset link. Please request a new password reset email.'
              };
            }
          } catch (tokenError) {
            console.error('❌ Token processing failed:', tokenError);
            return {
              success: false,
              error: 'Invalid reset link format. Please request a new password reset email.'
            };
          }
        } else {
          return {
            success: false,
            error: 'No valid authentication found. Please request a new password reset email.',
            requiresAuth: true
          };
        }
      }

      // Execute password update
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('❌ Password update failed:', updateError);
        return {
          success: false,
          error: updateError.message || 'Failed to update password'
        };
      }

      // Clear tokens from URL for security
      this.clearTokensFromURL();

      console.log('✅ Password reset completed successfully');
      return {
        success: true,
        warnings: ['Password updated successfully']
      };

    } catch (error) {
      console.error('❌ Password reset failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Extract recovery tokens from URL hash
   */
  private static extractTokensFromURL(): { access_token: string; refresh_token: string } | null {
    try {
      const hash = window.location.hash.substring(1);
      if (!hash) return null;

      const params = new URLSearchParams(hash);
      const type = params.get('type');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (type === 'recovery' && accessToken && refreshToken) {
        console.log('🔍 Recovery tokens found in URL');
        return {
          access_token: accessToken,
          refresh_token: refreshToken
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error extracting tokens:', error);
      return null;
    }
  }

  /**
   * Clear tokens from URL for security
   */
  private static clearTokensFromURL(): void {
    try {
      if (window.location.hash) {
        // Replace current history entry to remove tokens
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        console.log('🧹 Cleared tokens from URL');
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear tokens from URL:', error);
    }
  }

  /**
   * Check if recovery tokens are present in URL
   */
  static hasRecoveryTokens(): boolean {
    try {
      const hash = window.location.hash.substring(1);
      if (!hash) return false;

      const params = new URLSearchParams(hash);
      return params.get('type') === 'recovery' && 
             !!params.get('access_token') && 
             !!params.get('refresh_token');
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current environment domain for redirect URLs
   */
  static getResetURL(): string {
    return `${window.location.origin}/reset-password`;
  }
}