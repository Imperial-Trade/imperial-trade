import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations/loginSchema";
import { useRateLimiting } from "./useRateLimiting";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export const useOptimizedLoginForm = () => {
  const { toast } = useToast();
  const { canSubmit, recordAttempt } = useRateLimiting(
    "login",
    5,
    15 * 60 * 1000
  );

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      website: "",
    },
    mode: "onChange",
  });

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      if (!canSubmit) {
        toast({
          variant: "destructive",
          title: "Too Many Attempts",
          description: "Please wait before trying to login again.",
        });
        return;
      }

      if (data.website && data.website.length > 0) {
        logger.log("Bot detected via honeypot");
        return;
      }

      try {
        recordAttempt();

        const { data: authData, error } =
          await supabase.auth.signInWithPassword({
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
      } catch (error: any) {
        logger.error("Login error:", error);

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
    },
    [canSubmit, recordAttempt, toast]
  );

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    canSubmit,
    isSubmitting: form.formState.isSubmitting,
  };
};
