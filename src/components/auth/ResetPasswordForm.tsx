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
  tokenHash: string;
  token: string;
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
    try {
      const url = window.location.href;
      console.log('🔍 Extracting tokens from URL:', url);
      console.log('🔍 URL Components:', {
        pathname: window.location.pathname,
        hash: window.location.hash,
        search: window.location.search,
        href: url
      });
      
      // Check hash parameters first (Supabase auth URLs use hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      let tokenHash = hashParams.get('token_hash');
      let token = hashParams.get('token');
      let type = hashParams.get('type');
      
      console.log('🔑 Hash params extracted:', { tokenHash: !!tokenHash, token: !!token, type });
      
      // Fallback to search parameters
      if (!tokenHash || !token) {
        console.log('🔄 Trying search parameters as fallback...');
        const searchParams = new URLSearchParams(window.location.search);
        tokenHash = tokenHash || searchParams.get('token_hash');
        token = token || searchParams.get('token');
        type = type || searchParams.get('type');
        console.log('🔑 Search params extracted:', { tokenHash: !!tokenHash, token: !!token, type });
      }
      
      console.log('🎯 Final token extraction result:', {
        hasTokenHash: !!tokenHash,
        hasToken: !!token,
        type,
        tokenHashLength: tokenHash?.length || 0,
        tokenLength: token?.length || 0,
        typeValid: type === 'recovery'
      });
      
      if (tokenHash && token && type === 'recovery') {
        console.log('✅ Valid recovery tokens found for password reset');
        return { tokenHash, token, type };
      }
      
      console.log('❌ Missing or invalid tokens for password reset:', {
        missingTokenHash: !tokenHash,
        missingToken: !token, 
        invalidType: type !== 'recovery'
      });
      return null;
    } catch (error) {
      console.error('❌ Error extracting tokens:', error);
      return null;
    }
  };

  const validateTokenFormat = (tokenData: TokenData): boolean => {
    // Basic format validation
    if (tokenData.tokenHash.length < 32) {
      setErrorMessage("Invalid reset link format. The token appears to be corrupted.");
      return false;
    }
    
    if (tokenData.token.length < 6) {
      setErrorMessage("Invalid reset link format. The verification code is incomplete.");
      return false;
    }
    
    return true;
  };

  const processResetLink = async () => {
    setIsValidating(true);
    setErrorMessage(null);
    
    try {
      console.log('🔐 Processing password reset link...');
      console.log('📍 Current URL state:', {
        href: window.location.href,
        pathname: window.location.pathname,
        hash: window.location.hash,
        search: window.location.search
      });
      
      // Extract tokens from URL
      const extractedTokens = extractTokensFromUrl();
      
      if (!extractedTokens) {
        console.log('❌ No tokens found - displaying error message');
        setErrorMessage("No valid reset tokens found in the URL. Please use the complete link from your email.");
        setIsValidLink(false);
        return;
      }
      
      console.log('✅ Tokens extracted successfully, validating format...');
      
      // Validate token format
      if (!validateTokenFormat(extractedTokens)) {
        setIsValidLink(false);
        return;
      }
      
      // Store tokens for password update
      setTokenData(extractedTokens);
      setIsValidLink(true);
      
      console.log('✅ Reset tokens validated successfully');
      
      // Mark as being in password reset flow
      sessionStorage.setItem('password-reset-flow', 'true');
      
    } catch (error) {
      console.error('💥 Error processing reset link:', error);
      setErrorMessage("Failed to process the reset link. Please try again or request a new reset email.");
      setIsValidLink(false);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    processResetLink();
  }, []);

  const onSubmit = async (data: ResetPasswordData) => {
    if (!tokenData) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No reset token available. Please try again.",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('🔄 Starting password reset process...');
      
      // First verify the token and establish session
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenData.tokenHash,
        token: tokenData.token,
        type: 'recovery'
      });

      if (verifyError) {
        console.error('❌ Token verification failed:', verifyError);
        
        let errorMessage = "Failed to verify the reset link.";
        
        if (verifyError.message?.toLowerCase().includes('expired')) {
          errorMessage = "This reset link has expired. Please request a new password reset.";
        } else if (verifyError.message?.toLowerCase().includes('invalid')) {
          errorMessage = "This reset link is invalid. Please request a new password reset.";
        } else if (verifyError.message?.toLowerCase().includes('already_used')) {
          errorMessage = "This reset link has already been used. Please request a new password reset.";
        }
        
        toast({
          variant: "destructive",
          title: "Reset Link Error",
          description: errorMessage,
        });
        return;
      }

      if (!verifyData?.session?.user) {
        throw new Error("Failed to establish authenticated session for password update");
      }

      console.log('✅ Token verified, updating password...');
      
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password
      });

      if (updateError) {
        console.error('❌ Password update failed:', updateError);
        toast({
          variant: "destructive",
          title: "Password Update Failed",
          description: updateError.message || "Failed to update password. Please try again.",
        });
        return;
      }

      console.log('✅ Password updated successfully');
      setResetComplete(true);
      
      toast({
        title: "Password Updated Successfully",
        description: "Your password has been updated. You will be redirected to the dashboard.",
      });

      // Clean up
      sessionStorage.removeItem('password-reset-flow');
      window.history.replaceState({}, document.title, '/reset-password');

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard/home', { replace: true });
      }, 2000);

    } catch (error) {
      console.error('💥 Password reset error:', error);
      toast({
        variant: "destructive",
        title: "Reset Failed", 
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
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
                onClick={() => navigate('/signin')}
                className="w-full bg-lime-300 hover:bg-lime-200 text-black font-semibold"
              >
                Go to Sign In
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