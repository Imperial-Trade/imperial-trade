/**
 * Email Redirect URL Fix
 * Ensures password reset emails use the correct domain/URL
 */

import { supabase } from '@/integrations/supabase/client';

export class EmailRedirectFix {
  /**
   * Get the correct password reset URL for the current environment
   */
  static getPasswordResetUrl(): string {
    // Use environment-aware URL generation
    if (typeof window !== 'undefined') {
      // Browser environment - use current domain for consistency
      const baseUrl = window.location.origin;
      return `${baseUrl}/reset-password`;
    }
    
    // Fallback for server-side rendering or other environments
    return '/reset-password';
  }

  /**
   * Send password reset email with environment-aware redirect URL
   */
  static async sendPasswordResetEmail(email: string): Promise<{ 
    success: boolean; 
    error?: string; 
  }> {
    try {
      const redirectUrl = this.getPasswordResetUrl();
      
      console.log('📧 Sending password reset email:', {
        email: email,
        redirectTo: redirectUrl
      });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('❌ Password reset email failed:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Password reset email sent successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Password reset email exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate if current page can handle password reset
   */
  static canHandlePasswordReset(): boolean {
    const currentPath = window.location.pathname;
    return currentPath.includes('/reset-password') || 
           currentPath === '/reset-password';
  }

  /**
   * Extract and log debug information about current URL
   */
  static debugCurrentUrl(): void {
    console.log('🔍 Current URL Debug Info:', {
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      hash: window.location.hash,
      search: window.location.search,
      canHandleReset: this.canHandlePasswordReset()
    });
  }
}