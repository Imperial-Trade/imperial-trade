
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations/loginSchema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useLoginForm = () => {
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      website: "", // Honeypot field
    },
    mode: "onChange",
  });

  const waitForAuthState = (timeoutMs: number = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = timeoutMs / 100;
      
      const checkAuthState = async () => {
        attempts++;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('✅ Auth state confirmed after login');
            resolve(true);
            return;
          }
        } catch (error) {
          console.error('❌ Error checking auth state:', error);
        }
        
        if (attempts >= maxAttempts) {
          console.warn('⚠️ Auth state check timeout');
          resolve(false);
          return;
        }
        
        setTimeout(checkAuthState, 100);
      };
      
      checkAuthState();
    });
  };

  const onSubmit = async (data: LoginFormData) => {
    // Check honeypot
    if (data.website && data.website.length > 0) {
      console.log("🤖 Bot detected via honeypot");
      return; // Silent fail for bots
    }

    try {
      console.log('🔐 Attempting login for:', data.email);
      
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }

      console.log('✅ Login successful, waiting for auth state...');
      
      // Wait for auth state to propagate
      const authStateConfirmed = await waitForAuthState();
      
      if (authStateConfirmed) {
        toast({
          title: "Success!",
          description: "You have been logged in successfully.",
        });
      } else {
        console.warn('⚠️ Login succeeded but auth state not confirmed');
        toast({
          title: "Login Complete",
          description: "Please wait while we finish setting up your session...",
          variant: "default",
        });
      }

      // Redirect will be handled by the parent component
    } catch (error: any) {
      console.error("❌ Login error:", error);
      
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Please check your email and confirm your account.";
      } else if (error.message?.includes("Too many requests")) {
        errorMessage = "Too many login attempts. Please wait and try again.";
      } else if (error.message?.includes("Network error")) {
        errorMessage = "Network error. Please check your connection and try again.";
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
    onSubmit: (data: LoginFormData) => onSubmit(data),
    isSubmitting: form.formState.isSubmitting,
  };
};
