import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SimplifiedSignupFormData } from "@/lib/validations/simplifiedSignupSchema";

export const useSimplifiedSignup = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(true);
  const navigate = useNavigate();

  // Handle email/password signup
  const handleEmailSignup = async (data: SimplifiedSignupFormData): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsSubmitting(true);

      // Check if honeypot is filled (bot detection)
      if (data.website && data.website.length > 0) {
        console.warn("Honeypot triggered - potential bot submission");
        return { success: false, error: "Invalid submission detected" };
      }

      // Check if terms are accepted
      if (!data.terms_accepted) {
        return { success: false, error: "You must accept the terms of service" };
      }

      // Call the simplified-signup edge function to hash password and create account request
      const { data: signupData, error: signupError } = await supabase.functions.invoke('simplified-signup', {
        body: {
          full_name: data.full_name,
          email: data.email,
          password: data.password,
          terms_accepted: data.terms_accepted,
        }
      });

      if (signupError) {
        throw signupError;
      }

      if (signupData?.error) {
        return { success: false, error: signupData.error };
      }

      toast.success("Account request submitted successfully!");
      return { success: true };

    } catch (error: any) {
      console.error("Signup error:", error);
      const errorMessage = error.message || "Failed to submit account request. Please try again.";
      return { success: false, error: errorMessage };
    } finally {
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
