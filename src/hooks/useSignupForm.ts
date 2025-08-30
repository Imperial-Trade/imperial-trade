
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  website: z.string().optional(), // Honeypot field
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignupFormData = z.infer<typeof signupSchema>;

export const useSignupForm = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      website: "", // Honeypot field
    },
    mode: "onChange",
  });

  const onSubmit = async (data: SignupFormData): Promise<{ success: boolean; error?: string }> => {
    // Check honeypot
    if (data.website && data.website.length > 0) {
      console.log("Bot detected via honeypot");
      return { success: false, error: "Invalid submission detected" };
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/dashboard/home`;
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        throw error;
      }

      if (authData.user && !authData.user.email_confirmed_at) {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link. Please check your email and click the link to complete your registration.",
        });
      } else {
        toast({
          title: "Account created successfully!",
          description: "Welcome to Imperial Trading. You can now sign in.",
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error("Signup error:", error);
      
      let errorMessage = "Failed to create account. Please try again.";
      
      if (error.message?.includes("User already registered")) {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (error.message?.includes("Password should be at least")) {
        errorMessage = "Password should be at least 6 characters long.";
      } else if (error.message?.includes("Invalid email")) {
        errorMessage = "Please enter a valid email address.";
      } else if (error.message?.includes("Signup requires a valid password")) {
        errorMessage = "Please enter a valid password.";
      }

      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: errorMessage,
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isLoading,
  };
};
