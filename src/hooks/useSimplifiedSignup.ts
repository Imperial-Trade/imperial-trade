import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SimplifiedSignupFormData } from "@/lib/validations/simplifiedSignupSchema";
import { withTimeout } from "@/api/client/utils/timeout";
import { withRetry } from "@/api/client/utils/retry";

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
        const { data: signupData, error: signupError } = await supabase.functions.invoke('simplified-signup', {
          body: {
            full_name: data.full_name,
            email: data.email,
            phone_number: data.phone_number || null,
            password: data.password,
            terms_accepted: data.terms_accepted,
          }
        });

        if (signupError) throw signupError;
        if (signupData?.error) throw new Error(signupData.error);
        
        return signupData;
      };

      // Wrap with timeout (30s) and retry (1 retry with 2s delay)
      const signupData = await withRetry(
        () => withTimeout(signupOperation(), 30000),
        { maxAttempts: 2, initialDelay: 2000 }
      );

      console.log('📥 [SIGNUP-DEBUG] Edge function response received:', {
        has_signupData: !!signupData,
        signupData_keys: signupData ? Object.keys(signupData) : []
      });

      console.log('✅ [SIGNUP-DEBUG] Signup successful!');
      toast.success("Account request submitted successfully!");
      return { success: true };

    } catch (error: any) {
      console.error("💥 [SIGNUP-DEBUG] Exception caught:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Enhanced error messages
      let errorMessage = "Failed to submit account request. Please try again.";
      
      if (error.message?.includes('timeout')) {
        errorMessage = "Request timed out. The server may be busy. Please try again in a moment.";
      } else if (error.message?.includes('fetch')) {
        errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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
