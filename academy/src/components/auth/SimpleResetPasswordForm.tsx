import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { SimplePasswordReset, ResetSession } from '@/utils/simplePasswordReset';
import { toast } from 'sonner';

export const SimpleResetPasswordForm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [session, setSession] = useState<ResetSession | null>(null);
  const navigate = useNavigate();

  // Validate reset session on mount
  useEffect(() => {
    const validateSession = async () => {
      setValidating(true);
      try {
        const resetSession = await SimplePasswordReset.validateResetSession();
        setSession(resetSession);
        
        if (resetSession.isValid) {
          console.log(`✅ Reset session valid via ${resetSession.method}`);
          if (resetSession.method === 'fallback') {
            toast.warning('Using fallback authentication mode. If this was not you, please close this page.');
          }
        }
      } catch (error) {
        console.error('❌ Session validation failed:', error);
        setSession({ isValid: false, method: 'direct_auth', user: null });
      } finally {
        setValidating(false);
      }
    };

    validateSession();
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await SimplePasswordReset.resetPassword(password);

      if (result.success) {
        toast.success('Password updated successfully!');
        
        // Add guidance for users with approved accounts
        setTimeout(() => {
          toast.info(
            'If you have an approved account, return to the Account Status page to activate it with your new password.',
            { duration: 6000 }
          );
        }, 1500);
        
        // Redirect to dashboard after success
        setTimeout(() => {
          navigate('/dashboard/home');
        }, 3000);
      } else {
        if (result.requiresAuth) {
          toast.error(result.error || 'Authentication required');
          setTimeout(() => navigate('/signin'), 1000);
        } else {
          toast.error(result.error || 'Password reset failed');
        }
      }
    } catch (error) {
      console.error('❌ Password reset error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <Card className="w-full max-w-md mx-auto glass-effect border-default backdrop-blur-md bg-surface/90">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2 text-white">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Validating reset session...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Invalid session state
  if (!session?.isValid) {
    return (
      <Card className="w-full max-w-md mx-auto glass-effect border-default backdrop-blur-md bg-surface/90">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Invalid Reset Link</CardTitle>
          <CardDescription className="text-center text-white/80">
            This password reset link is invalid or has expired. Please request a new password reset email.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            to="/signin"
            className="flex items-center justify-center text-sm text-white/70 hover:text-primary transition-colors w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Valid session - show reset form
  return (
    <Card className="w-full max-w-md mx-auto glass-effect border-default backdrop-blur-md bg-surface/90">
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-center text-white">Set New Password</CardTitle>
        <CardDescription className="text-center text-white/80">
          Enter your new password below to complete the reset process.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handlePasswordReset}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your new password (min. 8 characters)"
                minLength={8}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-white">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your new password"
                minLength={8}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full bg-lime-300 hover:bg-lime-200 text-black font-semibold py-3 h-12" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Password...
              </>
            ) : (
              'Update Password'
            )}
          </Button>

          <div className="flex flex-col gap-2 w-full">
            <Link
              to="/account-request-status"
              className="flex items-center justify-center text-sm text-white/70 hover:text-primary transition-colors"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Account Status Page
            </Link>
            
            <Link
              to="/signin"
              className="flex items-center justify-center text-sm text-white/70 hover:text-primary transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};