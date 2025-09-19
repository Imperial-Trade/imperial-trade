import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, ArrowLeft, Clock, AlertTriangle, Mail, RefreshCw } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Password strength checker
const getPasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 25;
  return strength;
};

// Schema and types
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one number or special character"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

type TokenValidationState = 'validating' | 'valid' | 'expired' | 'invalid' | 'missing';

export const ResetPasswordForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingNew, setIsRequestingNew] = useState(false);
  const [tokenState, setTokenState] = useState<TokenValidationState>('validating');
  const [userEmail, setUserEmail] = useState<string>('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch("password", "");

  // Validate reset tokens and session on component mount
  useEffect(() => {
    const validateTokens = async () => {
      try {
        setTokenState('validating');
        
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');

        console.log('🔍 Reset password URL hash params:', {
          accessToken: accessToken ? 'present' : 'missing',
          refreshToken: refreshToken ? 'present' : 'missing',
          type,
          error,
          errorCode,
          errorDescription
        });

        // Handle specific error cases from the URL
        if (error) {
          if (errorCode === 'otp_expired' || error === 'token_expired') {
            setTokenState('expired');
          } else if (error === 'access_denied' || error === 'invalid_request') {
            setTokenState('invalid');
          } else {
            setTokenState('invalid');
          }
          return;
        }

        // Check for missing tokens
        if (!accessToken || !refreshToken || type !== 'recovery') {
          setTokenState('missing');
          return;
        }

        // Try to set the session to validate tokens
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            if (sessionError.message.includes('expired') || sessionError.message.includes('Invalid')) {
              setTokenState('expired');
            } else {
              setTokenState('invalid');
            }
            return;
          }

          // Get user info to show email
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            setUserEmail(user.email);
          }

          setTokenState('valid');
        } catch (error) {
          console.error('❌ Session validation error:', error);
          setTokenState('invalid');
        }

      } catch (error) {
        console.error('❌ Error parsing recovery tokens from URL hash:', error);
        setTokenState('invalid');
      }
    };

    validateTokens();
  }, [navigate]);

  // Handle requesting a new reset link
  const handleRequestNewLink = async () => {
    if (!userEmail) {
      toast.error('Email not available. Please go back to sign in and request a new reset link.');
      navigate('/signin');
      return;
    }

    setIsRequestingNew(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      toast.success('New password reset link sent! Check your email.');
      setTokenState('validating');
    } catch (error) {
      console.error('Error requesting new reset link:', error);
      toast.error('Failed to send new reset link. Please try again.');
    } finally {
      setIsRequestingNew(false);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ResetPasswordData) => {
    if (tokenState !== 'valid') {
      toast.error('Invalid or expired reset token. Please request a new reset link.');
      return;
    }

    try {
      setIsLoading(true);

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        if (updateError.message.includes('expired') || updateError.message.includes('Invalid')) {
          setTokenState('expired');
          toast.error('Reset token has expired. Please request a new reset link.');
          return;
        }
        throw updateError;
      }

      toast.success('Password updated successfully! Redirecting to dashboard...');
      
      // Small delay to show success message before redirect
      setTimeout(() => {
        navigate('/dashboard/home');
      }, 1500);

    } catch (error) {
      console.error('Password reset error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

  // Show loading state while validating tokens
  if (tokenState === 'validating') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Validating reset link...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error states for invalid tokens
  if (tokenState !== 'valid') {
    const getErrorContent = () => {
      switch (tokenState) {
        case 'expired':
          return {
            icon: <Clock className="h-12 w-12 text-amber-500" />,
            title: 'Reset Link Expired',
            description: 'This password reset link has expired. Reset links are only valid for 1 hour for security reasons.',
            action: 'Request New Reset Link'
          };
        case 'invalid':
          return {
            icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
            title: 'Invalid Reset Link',
            description: 'This password reset link is invalid or has already been used. Each reset link can only be used once.',
            action: 'Request New Reset Link'
          };
        case 'missing':
          return {
            icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
            title: 'Missing Reset Information',
            description: 'The required reset information is missing from this link. Please request a new password reset.',
            action: 'Go to Sign In'
          };
        default:
          return {
            icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
            title: 'Reset Link Problem',
            description: 'There was an issue with your reset link. Please request a new password reset.',
            action: 'Go to Sign In'
          };
      }
    };

    const errorContent = getErrorContent();

    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            {errorContent.icon}
          </div>
          <CardTitle className="text-2xl font-bold">{errorContent.title}</CardTitle>
          <CardDescription className="text-center">
            {errorContent.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              For security, password reset links expire after 1 hour and can only be used once.
            </AlertDescription>
          </Alert>
          
          {userEmail && (tokenState === 'expired' || tokenState === 'invalid') && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Reset link for: <strong>{userEmail}</strong>
              </p>
              <Button 
                onClick={handleRequestNewLink} 
                disabled={isRequestingNew}
                className="w-full"
              >
                {isRequestingNew ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sending New Link...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {errorContent.action}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Link
            to="/signin"
            className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Set New Password</CardTitle>
        <CardDescription className="text-center">
          Enter your new password below
          {userEmail && (
            <div className="text-sm text-muted-foreground mt-2">
              Resetting password for: <strong>{userEmail}</strong>
            </div>
          )}
        </CardDescription>
      </CardHeader>
      
      {/* Urgency Alert */}
      <div className="px-6 pb-2">
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Complete within 1 hour:</strong> This reset link expires for security. Complete your password reset now.
          </AlertDescription>
        </Alert>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* New Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your new password"
                {...register("password")}
                className={errors.password ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
            
            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Password Strength:</span>
                  <span className={`font-medium ${
                    passwordStrength < 50 ? 'text-red-500' : 
                    passwordStrength < 75 ? 'text-yellow-500' : 
                    'text-green-500'
                  }`}>
                    {passwordStrength < 25 ? 'Very Weak' : 
                     passwordStrength < 50 ? 'Weak' : 
                     passwordStrength < 75 ? 'Good' : 'Strong'}
                  </span>
                </div>
                <Progress value={passwordStrength} className="h-2" />
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                {...register("confirmPassword")}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </Button>

          <Link
            to="/signin"
            className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
};