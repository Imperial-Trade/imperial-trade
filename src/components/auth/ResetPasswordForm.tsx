import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PasswordStrengthMeter } from "@/components/security/PasswordStrengthMeter";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidLink, setIsValidLink] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const processResetLink = async () => {
      try {
        console.log("Processing reset link...");
        console.log("Current URL:", window.location.href);
        
        // Check both hash parameters and query parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        // Log all parameters for debugging
        console.log("Hash parameters:", Object.fromEntries(hashParams.entries()));
        console.log("Search parameters:", Object.fromEntries(searchParams.entries()));
        
        // Try to get tokens from both sources
        let accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        let refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
        let type = hashParams.get('type') || searchParams.get('type');
        
        // Also check for alternative parameter names that Supabase might use
        if (!accessToken) {
          accessToken = hashParams.get('token') || searchParams.get('token');
        }
        
        console.log("Extracted tokens:", { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
        
        // Check if this is a password recovery request
        if ((type === 'recovery' || type === 'password_recovery') && accessToken) {
          console.log("Valid recovery type detected, setting up session...");
          
          // Prepare session data
          const sessionData: any = { access_token: accessToken };
          if (refreshToken) {
            sessionData.refresh_token = refreshToken;
          }
          
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession(sessionData);
          
          if (error) {
            console.error("Session setup error:", error);
            toast({
              variant: "destructive",
              title: "Invalid Reset Link",
              description: `This password reset link is invalid or has expired. Error: ${error.message}`,
            });
            navigate('/signin');
            return;
          }
          
          console.log("Session created:", !!data.session?.user);
          
          // Verify the session is valid
          if (data.session?.user) {
            console.log("Valid session established for user:", data.session.user.email);
            setIsValidLink(true);
          } else {
            throw new Error("No valid session created - no user found");
          }
        } else {
          console.log("No valid reset parameters found or wrong type");
          toast({
            variant: "destructive",
            title: "Invalid Reset Link", 
            description: "This password reset link is invalid or has expired. Missing required parameters.",
          });
          navigate('/signin');
        }
      } catch (error) {
        console.error("Reset link processing error:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: `Unable to process reset link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        navigate('/signin');
      } finally {
        setIsValidating(false);
      }
    };

    // Also listen to auth state changes to handle automatic authentication
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, !!session?.user);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log("Password recovery event detected");
        setIsValidLink(true);
        setIsValidating(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        console.log("User signed in during reset process");
        setIsValidLink(true);
        setIsValidating(false);
      }
    });

    processResetLink();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const onSubmit = async (data: ResetPasswordData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
        return;
      }

      setResetComplete(true);
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard/home');
      }, 2000);
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        variant: "destructive",
        title: "Error", 
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while validating
  if (isValidating) {
    return (
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-lime-200">
            Validating Reset Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-300 border-t-transparent" />
            </div>
            <p className="text-slate-50">
              Please wait while we validate your reset link...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (resetComplete) {
    return (
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-lime-200">
            Password Updated
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-lime-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-lime-400" />
            </div>
            <p className="text-slate-50">
              Your password has been successfully updated.
            </p>
            <p className="text-sm text-slate-300">
              Redirecting you to the dashboard...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render the form until we have a valid session
  if (!isValidLink) {
    return null;
  }

  return (
    <Card className="glass-effect border-default">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-lime-200">
          Set New Password
        </CardTitle>
        <p className="text-center text-slate-50">
          Enter your new password below
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <PasswordStrengthMeter password={field.value} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-lime-300 hover:bg-lime-200 text-black font-semibold py-3 h-12"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent mr-2" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};