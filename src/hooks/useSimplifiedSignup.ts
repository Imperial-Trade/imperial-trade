import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SimplifiedSignupFormData } from "@/lib/validations/simplifiedSignupSchema";
import { withTimeout } from "@/api/client/utils/timeout";
import { withRetry } from "@/api/client/utils/retry";

// Client-side password hashing using Web Crypto API
async function hashPasswordClient(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordData = encoder.encode(password);
  
  const combined = new Uint8Array(salt.length + passwordData.length);
  combined.set(salt);
  combined.set(passwordData, salt.length);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const hashArray = new Uint8Array(hashBuffer);
  
  const result = new Uint8Array(salt.length + hashArray.length);
  result.set(salt);
  result.set(hashArray, salt.length);
  
  return btoa(String.fromCharCode(...result));
}

export const useSimplifiedSignup = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(true);
  const navigate = useNavigate();

  // Handle email/password signup
  const handleEmailSignup = async (data: SimplifiedSignupFormData): Promise<{ success: boolean; error?: string }> => {
    console.log('🚀 [SIGNUP-DEBUG] Starting email signup process...', {
      email_prefix: data.email?.substring(0, 3) + '***',
      has_password: !!data.password,
      has_phone: !!data.phone_number,
      has_full_name: !!data.full_name,
      terms_accepted: data.terms_accepted,
      timestamp: new Date().toISOString()
    });

    try {
      setIsSubmitting(true);
      console.log('🔄 [SIGNUP-DEBUG] Set isSubmitting to true');

      // Check if honeypot is filled (bot detection)
      if (data.website && data.website.length > 0) {
        console.warn("🤖 [SIGNUP-DEBUG] Honeypot triggered - potential bot submission");
        return { success: false, error: "Invalid submission detected" };
      }
      console.log('✅ [SIGNUP-DEBUG] Honeypot check passed');

      // Check if terms are accepted
      if (!data.terms_accepted) {
        console.warn('⚠️ [SIGNUP-DEBUG] Terms not accepted');
        return { success: false, error: "You must accept the terms of service" };
      }
      console.log('✅ [SIGNUP-DEBUG] Terms check passed');

      // Call the simplified-signup edge function with timeout and retry
      console.log('📡 [SIGNUP-DEBUG] Calling simplified-signup edge function...', {
        body_keys: Object.keys({
          full_name: data.full_name,
          email: data.email,
          phone_number: data.phone_number || null,
          password: data.password,
          terms_accepted: data.terms_accepted,
        })
      });

      const signupOperation = async () => {
        const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI';
        
        // Network debugging
        console.log('🌐 [NETWORK-DEBUG] Direct fetch request details:', {
          url: 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/simplified-signup',
          method: 'POST',
          has_anon_key: true,
          anon_key_prefix: ANON_KEY.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
          request_body: {
            full_name: data.full_name,
            email: data.email?.substring(0, 3) + '***',
            has_phone: !!data.phone_number,
            has_password: !!data.password,
            terms_accepted: data.terms_accepted,
          }
        });

        const response = await fetch(
          'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/simplified-signup',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ANON_KEY}`,
              'apikey': ANON_KEY,
            },
            body: JSON.stringify({
              full_name: data.full_name,
              email: data.email,
              phone_number: data.phone_number || null,
              password: data.password,
              terms_accepted: data.terms_accepted,
            })
          }
        );

        console.log('📥 [NETWORK-DEBUG] Response received:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          headers: {
            contentType: response.headers.get('content-type'),
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [NETWORK-DEBUG] Error response:', errorText);
          throw new Error(errorText || `HTTP ${response.status}: ${response.statusText}`);
        }

        const signupData = await response.json();
        
        if (signupData?.error) {
          throw new Error(signupData.error);
        }
        
        return signupData;
      };

      // Try edge function with timeout and retry
      try {
        const signupData = await withRetry(
          () => withTimeout(signupOperation(), 30000),
          { maxAttempts: 2, initialDelay: 2000 }
        );

        console.log('📥 [SIGNUP-DEBUG] Edge function response received:', {
          has_signupData: !!signupData,
          signupData_keys: signupData ? Object.keys(signupData) : []
        });

        console.log('✅ [SIGNUP-DEBUG] Signup successful via edge function!');
        toast.success("Account request submitted successfully!");
        return { success: true };

      } catch (edgeFunctionError: any) {
        console.error("💥 [SIGNUP-DEBUG] Edge function failed:", {
          message: edgeFunctionError.message,
          name: edgeFunctionError.name,
        });
        
        console.log('🔄 [FALLBACK] Attempting direct database insert...');
        
        // EMERGENCY FALLBACK: Direct database insert with client-side password hashing
        try {
          const password_hash = await hashPasswordClient(data.password);
          console.log('🔐 [FALLBACK] Password hash created on client-side');
          
          const { data: insertData, error: insertError } = await supabase
            .from('account_requests')
            .insert({
              full_name: data.full_name,
              email: data.email.toLowerCase(),
              phone_number: data.phone_number || null,
              password_hash: password_hash,
              terms_accepted: data.terms_accepted,
              terms_accepted_at: new Date().toISOString(),
              status: 'pending',
              account_type: 'user',
            })
            .select()
            .single();

          if (insertError) {
            console.error('❌ [FALLBACK] Database insert failed:', insertError);
            throw new Error(insertError.message);
          }

          console.log('✅ [FALLBACK] Account request created via direct database insert!', {
            request_id: insertData?.id,
          });
          
          toast.success("Account request submitted successfully!");
          return { success: true };

        } catch (fallbackError: any) {
          console.error("💥 [FALLBACK] Direct database insert failed:", {
            message: fallbackError.message,
            name: fallbackError.name,
          });
          
          let errorMessage = "Failed to submit account request. Please try again.";
          
          if (fallbackError.message?.includes('duplicate') || fallbackError.message?.includes('unique')) {
            errorMessage = "An account with this email already exists. Please use a different email or check your account status.";
          } else if (fallbackError.message) {
            errorMessage = fallbackError.message;
          }
          
          toast.error(errorMessage);
          return { success: false, error: errorMessage };
        }
      }

    } catch (error: any) {
      console.error("💥 [SIGNUP-DEBUG] Unexpected error:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      const errorMessage = error.message || "Failed to submit account request. Please try again.";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
      
    } finally {
      console.log('🏁 [SIGNUP-DEBUG] Process complete, resetting isSubmitting');
      setIsSubmitting(false);
    }
  };

  // Handle Facebook OAuth signup
  const handleFacebookSignup = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/account-request-status`,
          scopes: 'email public_profile',
        }
      });

      if (error) {
        throw error;
      }

      // OAuth redirect will happen automatically
      toast.success("Redirecting to Facebook...");
      
    } catch (error: any) {
      console.error("Facebook signup error:", error);
      toast.error(error.message || "Failed to sign up with Facebook. Please try again.");
      setIsSubmitting(false);
    }
  };

  return {
    handleEmailSignup,
    handleFacebookSignup,
    isSubmitting,
    canSubmit,
    setCanSubmit,
  };
};
