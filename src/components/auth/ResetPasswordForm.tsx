import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { PasswordStrengthMeter } from "@/components/security/PasswordStrengthMeter";

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

interface TokenData {
  access_token: string;
  refresh_token: string;
  type: string;
}

export const ResetPasswordForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidLink, setIsValidLink] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const extractTokensFromUrl = (): TokenData | null => {
    console.log('🔍 Reset Password URL Debug:', {
      fullUrl: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash
    });

    // Try hash parameters first (Supabase native format)
    let params: URLSearchParams;
    let source = '';
    
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      params = new URLSearchParams(hash);
      source = 'hash';
      console.log('📍 Checking hash parameters:', hash);
    } else if (window.location.search) {
      // Try query parameters as fallback
      params = new URLSearchParams(window.location.search);
      source = 'query';
      console.log('📍 Checking query parameters:', window.location.search);
    } else {
      console.log('❌ No hash or query parameters found');
      return null;
    }
    
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type');
    
    console.log('🔑 Token extraction results:', {
      source,
      access_token: access_token ? 'found' : 'missing',
      refresh_token: refresh_token ? 'found' : 'missing',
      type,
      hasValidTokens: !!(access_token && refresh_token && type === 'recovery')
    });
    
    if (!access_token || !refresh_token || type !== 'recovery') {
      console.log('❌ Invalid tokens:', { access_token: !!access_token, refresh_token: !!refresh_token, type });
      return null;
    }
    
    return { access_token, refresh_token, type };
  };

  const validateTokenFormat = (access_token: string): boolean => {
    // Basic format validation for JWT token
    if (access_token.length < 32) {
      setErrorMessage("Invalid reset link format. The token appears to be corrupted.");
      return false;
    }
    
    // Check if it looks like a JWT (has dots)
    if (!access_token.includes('.')) {
      setErrorMessage("Invalid reset link format. The token format is incorrect.");
      return false;
    }
    
    return true;
  };

  const processResetLink = async () => {
    console.log('🚀 Starting password reset link processing...');
    setIsValidating(true);
    setErrorMessage(null);
    
    try {
      // Check if user is already authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('✅ User already authenticated, allowing password reset');
        setIsValidLink(true);
        setTokenData({ access_token: 'session', refresh_token: 'session', type: 'recovery' });
        setIsValidating(false);
        return;
      }

      // Try to extract tokens from URL
      const tokens = extractTokensFromUrl();
      
      if (!tokens) {
        console.log('❌ No valid tokens found in URL');
        setErrorMessage("The password reset link is invalid or malformed. Please request a new one.");
        setIsValidLink(false);
        setIsValidating(false);
        return;
      }

      // Validate token format
      if (!validateTokenFormat(tokens.access_token)) {
        console.log('❌ Invalid token format');
        setErrorMessage("The reset token format is invalid. Please request a new password reset.");
        setIsValidLink(false);
        setIsValidating(false);
        return;
      }

      console.log('✅ Tokens validated successfully');
      // Store tokens for later use
      setTokenData(tokens);
      setIsValidLink(true);
      
    } catch (error) {
      console.error('❌ Error processing reset link:', error);
      setErrorMessage("An error occurred while processing the reset link. Please try again.");
      setIsValidLink(false);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    processResetLink();
  }, []);

  const onSubmit = async (data: ResetPasswordData) => {
    console.log('🔄 Starting password reset submission...');
    setIsSubmitting(true);

    try {
      // Check if user is already authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('✅ User authenticated, updating password directly');
        // User is authenticated, update password directly
        const { error } = await supabase.auth.updateUser({
          password: data.password
        });

        if (error) {
          console.error('❌ Password update error:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to update password. Please try again.",
            variant: "destructive",
          });
          return;
        }
      } else {
        console.log('🔑 No authenticated user, using stored tokens');
        // Use stored tokens to verify session
        if (!tokenData || tokenData.access_token === 'session') {
          console.log('❌ No token data available');
          toast({
            title: "Error",
            description: "No authentication tokens found. Please request a new password reset.",
            variant: "destructive",
          });
          return;
        }

        console.log('🔐 Setting session with tokens...');
        // Set the session using the tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        });

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          toast({
            title: "Authentication Error",
            description: sessionError.message || "Failed to authenticate. Please request a new password reset.",
            variant: "destructive",
          });
          return;
        }

        console.log('✅ Session established, updating password...');
        // Update password
        const { error } = await supabase.auth.updateUser({
          password: data.password
        });

        if (error) {
          console.error('❌ Password update error:', error);
          toast({
            title: "Error",
            description: error.message || "Failed to update password. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      console.log('✅ Password updated successfully!');
      toast({
        title: "Success",
        description: "Your password has been updated successfully!",
      });

      setResetComplete(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        console.log('🔄 Redirecting to dashboard...');
        navigate('/dashboard/home', { replace: true });
      }, 2000);

    } catch (error) {
      console.error('❌ Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    processResetLink();
  };

  // Loading state
  if (isValidating) {
    return (
      <Card className="glass-effect border-default max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-lime-200 flex items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            Validating Reset Link
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-slate-50 mb-4">
            Please wait while we validate your password reset link...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-300 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (resetComplete) {
    return (
      <Card className="glass-effect border-default max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-lime-200 flex items-center justify-center gap-2">
            <CheckCircle className="w-6 h-6" />
            Password Updated
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Alert className="bg-lime-500/20 border-lime-500/50">
            <CheckCircle className="h-4 w-4 text-lime-400" />
            <AlertDescription className="text-lime-100">
              Your password has been successfully updated. You will be redirected to the dashboard shortly.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <div className="animate-pulse w-6 h-6 bg-lime-400 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (!isValidLink) {
    return (
      <Card className="glass-effect border-default max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-lime-200 flex items-center justify-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            Invalid Reset Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage || "This password reset link is invalid or has expired."}
            </AlertDescription>
          </Alert>
          
          <details className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
            <summary className="cursor-pointer font-medium text-white">Debug Information</summary>
            <div className="mt-2 space-y-1 text-xs font-mono text-slate-300">
              <div>URL: {window.location.href}</div>
              <div>Hash: {window.location.hash || 'none'}</div>
              <div>Search: {window.location.search || 'none'}</div>
              <div>Path: {window.location.pathname}</div>
            </div>
          </details>
          
          <div className="space-y-3">
            <p className="text-slate-50 text-sm text-center">
              Please check that you used the complete link from your email, or request a new password reset.
            </p>
            
            <div className="flex flex-col gap-2">
              {retryCount < 2 && (
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              
              <Button 
                onClick={() => window.location.href = '/forgot-password'}
                className="w-full bg-lime-300 hover:bg-lime-200 text-black font-semibold"
              >
                Request New Reset Link
              </Button>
              
              <Button 
                onClick={() => navigate('/signin')}
                variant="outline"
                className="w-full border-white/20 text-white bg-black/20 hover:bg-white/20"
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Password reset form
  return (
    <Card className="glass-effect border-default max-w-md mx-auto">
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
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                        tabIndex={-1}
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
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                        tabIndex={-1}
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
              className="w-full bg-lime-300 hover:bg-lime-200 text-black font-semibold py-3 h-12 transition-all duration-200"
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

            <div className="text-center">
              <Link
                to="/signin"
                className="text-sm text-slate-300 hover:text-lime-200 transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};