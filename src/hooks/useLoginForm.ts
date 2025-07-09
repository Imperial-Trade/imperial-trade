
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations/loginSchema";
import { useRateLimiting } from "./useRateLimiting";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmailValidation } from "./useEmailValidation";

export const useLoginForm = () => {
  const { toast } = useToast();
  const { canSubmit, recordAttempt } = useRateLimiting('login', 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
  const { validateEmail } = useEmailValidation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      website: "", // Honeypot field
    },
    mode: "onChange",
  });

  const onSubmit = async (data: LoginFormData) => {
    if (!canSubmit) {
      toast({
        variant: "destructive",
        title: "Too Many Attempts",
        description: "Please wait before trying to login again.",
      });
      return;
    }

    // Check honeypot
    if (data.website && data.website.length > 0) {
      console.log("Bot detected via honeypot");
      return; // Silent fail for bots
    }

    // Pre-validate email status before attempting login
    const emailValidation = await validateEmail(data.email);
    
    if (emailValidation.status === 'not_found') {
      toast({
        variant: "destructive",
        title: "Email Not Found",
        description: "This email is not registered. Please submit an account request first.",
      });
      return;
    }

    if (emailValidation.status === 'pending') {
      toast({
        variant: "destructive",
        title: "Account Request Pending",
        description: "Your account request is still pending approval. Please check your request status.",
      });
      return;
    }

    if (emailValidation.status === 'rejected') {
      toast({
        variant: "destructive",
        title: "Account Request Rejected",
        description: "Your account request was rejected. Please check your request status for more details.",
      });
      return;
    }

    if (emailValidation.status === 'approved') {
      toast({
        variant: "destructive",
        title: "Account Setup Incomplete",
        description: "Your account was approved but password setup is incomplete. Please complete your account setup.",
      });
      return;
    }

    try {
      recordAttempt();
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: "You have been logged in successfully.",
      });

      // Redirect will be handled by the parent component
    } catch (error: any) {
      console.error("Login error:", error);
      
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Please check your email and confirm your account.";
      } else if (error.message?.includes("Too many requests")) {
        errorMessage = "Too many login attempts. Please wait and try again.";
      }

      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      });
      
      throw error;
    }
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    canSubmit,
    isSubmitting: form.formState.isSubmitting,
  };
};
