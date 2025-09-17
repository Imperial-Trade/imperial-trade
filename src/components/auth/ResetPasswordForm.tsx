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
  const [tokenData, setTokenData] = useState<{ tokenHash: string; token?: string } | null>(null);
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
        console.log("🔐 Processing password reset link...");
        console.log("📍 Current URL:", window.location.href);
        console.log("📍 Hash:", window.location.hash);
        console.log("📍 Search:", window.location.search);
        
        // Parse URL parameters - Supabase typically uses hash fragments
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        // Log all available parameters
        console.log("🔍 Hash params:", Object.fromEntries(hashParams.entries()));
        console.log("🔍 Search params:", Object.fromEntries(searchParams.entries()));
        
        // Extract proper Supabase password reset tokens
        const tokenHash = hashParams.get('token_hash') || searchParams.get('token_hash');
        const token = hashParams.get('token') || searchParams.get('token');
        const type = hashParams.get('type') || searchParams.get('type');
        const error = hashParams.get('error') || searchParams.get('error');
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
        
        console.log("🎯 Extracted data:", {
          hasTokenHash: !!tokenHash,
          hasToken: !!token,
          type,
          error,
          errorDescription,
          tokenHashLength: tokenHash?.length || 0,
          tokenLength: token?.length || 0
        });
        
        // Check for explicit errors first
        if (error) {
          console.error("❌ URL contains error:", error, errorDescription);
          toast({
            variant: "destructive",
            title: "Reset Link Error",
            description: errorDescription || `Authentication error: ${error}`,
          });
          setTimeout(() => navigate('/signin'), 2000);
          return;
        }
        
        // Check if we have proper password reset tokens WITHOUT auto-authenticating
        if (tokenHash && type === 'recovery') {
          console.log("✅ Found password reset tokens, storing for later use...");
          console.log("🔧 Token details:", {
            tokenHashLength: tokenHash.length,
            hasToken: !!token,
            tokenLength: token?.length || 0,
            type
          });
          
          // Basic token format validation (without calling Supabase)
          if (tokenHash.length < 20) {
            console.error("❌ Token hash appears too short");
            toast({
              variant: "destructive",
              title: "Invalid Reset Link",
              description: "The reset link appears to be corrupted. Please copy the entire URL from your email and try again.",
            });
            setTimeout(() => navigate('/signin'), 3000);
            return;
          }
          
          // Store tokens for password update WITHOUT establishing session
          setTokenData({ tokenHash, token });
          setIsValidLink(true);
          console.log("✅ Password reset tokens validated and stored (no session established)");
          
        } else if (!tokenHash && !type) {
          // No tokens at all - invalid access
          console.log("❌ No tokens found - invalid access");
          toast({
            variant: "destructive",
            title: "Invalid Access",
            description: "Please use the reset link from your email to access this page.",
          });
          navigate('/signin');
        } else {
          // Enhanced error handling for malformed links
          const urlLength = window.location.href.length;
          const hasPartialTokens = !!tokenHash || !!token;
          
          console.log("❌ Invalid token combination:", { 
            tokenHash: !!tokenHash, 
            token: !!token, 
            type,
            urlLength,
            hasPartialTokens,
            tokenHashLength: tokenHash?.length || 0,
            tokenLength: token?.length || 0
          });
          
          let errorMessage = "This password reset link is incomplete or invalid.";
          
          if (hasPartialTokens && (!tokenHash || tokenHash.length < 20)) {
            errorMessage = "The reset link appears to be corrupted. Please copy the entire URL from your email and try again.";
          } else if (type !== 'recovery' && type) {
            errorMessage = `Invalid link type '${type}'. This is not a password reset link.`;
          } else if (urlLength > 2000) {
            errorMessage = "The reset link is too long and may have been corrupted. Please request a new reset email.";
          }
          
          toast({
            variant: "destructive",
            title: "Invalid Reset Link",
            description: errorMessage,
          });
          setTimeout(() => navigate('/signin'), 3000);
        }
        
      } catch (error) {
        console.error("💥 Reset link processing error:", error);
        toast({
          variant: "destructive",
          title: "Processing Error",
          description: `Failed to process reset link: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        setTimeout(() => navigate('/signin'), 2000);
      } finally {
        setIsValidating(false);
      }
    };

    processResetLink();
  }, [navigate, toast]);

  const onSubmit = async (data: ResetPasswordData) => {
    setIsSubmitting(true);
    
    try {
      if (!tokenData) {
        throw new Error("No reset token available");
      }

      console.log("🔄 Updating password with stored tokens...");
      
      // First verify the token and establish session
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenData.tokenHash,
        type: 'recovery'
      });

      if (verifyError) {
        console.error("❌ Token verification failed during password update:", verifyError);
        
        if (verifyError.message?.includes('expired') || verifyError.message?.includes('Token has expired')) {
          toast({
            variant: "destructive",
            title: "Expired Reset Link",
            description: "This password reset link has expired. Please request a new one.",
          });
        } else if (verifyError.message?.includes('invalid') || verifyError.message?.includes('Invalid token')) {
          toast({
            variant: "destructive", 
            title: "Invalid Reset Link",
            description: "The reset link is invalid. Please request a new reset email.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Verification Error",
            description: `Failed to verify reset link: ${verifyError.message}`,
          });
        }
        return;
      }

      if (!verifyData?.session?.user) {
        throw new Error("Failed to establish session for password update");
      }

      console.log("✅ Token verified and session established, updating password...");
      
      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password
      });

      if (updateError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: updateError.message,
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