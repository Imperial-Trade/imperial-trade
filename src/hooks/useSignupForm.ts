
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  fullName: z.string().min(2, "Full name is required"),
  website: z.string().max(0, "Invalid submission").optional().default(""), // Honeypot
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignupFormData = z.infer<typeof signupSchema>;

export const useSignupForm = () => {
  const { toast } = useToast();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      website: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: SignupFormData) => {
    // Check honeypot
    if (data.website && data.website.length > 0) {
      console.log("Bot detected via honeypot");
      return;
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.fullName,
            display_name: data.fullName,
          }
        }
      });

      if (error) {
        throw error;
      }

      if (authData.user && !authData.user.email_confirmed_at) {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to complete your registration.",
        });
      } else {
        toast({
          title: "Registration successful!",
          description: "You have been registered successfully.",
        });
      }

    } catch (error: any) {
      console.error("Signup error:", error);
      
      let errorMessage = "Registration failed. Please try again.";
      
      if (error.message?.includes("User already registered")) {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (error.message?.includes("Password should be at least")) {
        errorMessage = "Password must be at least 6 characters long.";
      } else if (error.message?.includes("Invalid email")) {
        errorMessage = "Please enter a valid email address.";
      }

      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: errorMessage,
      });
      
      throw error;
    }
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isSubmitting: form.formState.isSubmitting,
  };
};
