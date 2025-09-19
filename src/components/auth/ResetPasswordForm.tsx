import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle, Shield, CheckCircle, AlertCircle, Bug } from "lucide-react";
import { Link } from "react-router-dom";
import { RecoveryFlowSecurity, RecoveryFlowState } from '@/utils/recoveryFlowSecurity';
import { TokenDebugDashboard } from '@/components/debug/TokenDebugDashboard';
import { isProduction } from '@/utils/environment';

export const ResetPasswordForm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [flowState, setFlowState] = useState<RecoveryFlowState | null>(null);
  const [validating, setValidating] = useState(true);
  const [showDebugDashboard, setShowDebugDashboard] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Initialize robust security validation on component mount
  useEffect(() => {
    const initializeSecurityValidation = async () => {
      try {
        setValidating(true);
        console.log('🔐 Initializing robust recovery flow validation...');
        
        const securityState = await RecoveryFlowSecurity.initializeRecoveryFlow({
          requireStrictValidation: true,
          enableDomainValidation: true,
          enableSessionPersistence: true,
          securityScoreThreshold: 70 // Slightly lower threshold for better UX
        });

        setFlowState(securityState);

        if (!securityState.isSecure) {
          setError(`Security validation failed: ${securityState.errors.join(', ')}`);
        } else if (securityState.warnings.length > 0) {
          console.warn('Security warnings:', securityState.warnings);
        }

      } catch (err) {
        console.error('❌ Security validation initialization failed:', err);
        setError('Failed to initialize secure recovery process');
      } finally {
        setValidating(false);
      }
    };

    // Only validate if we're not already loading auth
    if (!authLoading) {
      initializeSecurityValidation();
    }
  }, [authLoading]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Verify security flow is ready
    if (!flowState || !flowState.isSecure) {
      setError('Security validation not complete. Please refresh the page and try again.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('🔐 Executing secure password reset...');
      
      // Use the secure password reset method
      const resetResult = await RecoveryFlowSecurity.executeSecurePasswordReset(password);

      if (!resetResult.success) {
        throw new Error(resetResult.error || 'Password reset failed');
      }

      if (resetResult.warnings && resetResult.warnings.length > 0) {
        console.warn('Password reset warnings:', resetResult.warnings);
      }

      setMessage('Your password has been reset successfully! Redirecting to your dashboard...');
      
      // Redirect to the dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard/home');
      }, 2000);

    } catch (err) {
      console.error('Error resetting password:', err instanceof Error ? err.message : 'Unknown error');
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auth or security validation is initializing
  if (authLoading || validating) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>{authLoading ? 'Loading authentication...' : 'Validating security...'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show security status and errors
  if (flowState && !flowState.isSecure) {
    return (
      <>
        {/* Debug Dashboard for development */}
        {!isProduction() && (
          <div className="mb-4">
            <Button
              onClick={() => setShowDebugDashboard(!showDebugDashboard)}
              variant="outline"
              size="sm"
              className="w-full mb-4"
            >
              <Bug className="h-4 w-4 mr-2" />
              {showDebugDashboard ? 'Hide' : 'Show'} Debug Dashboard
            </Button>
            
            {showDebugDashboard && (
              <div className="mb-4">
                <TokenDebugDashboard />
              </div>
            )}
          </div>
        )}
        
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Security Validation Failed</CardTitle>
            <CardDescription className="text-center">
              The recovery link validation failed for security reasons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Security Issues:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                {flowState.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
            {flowState.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Warnings:</h4>
                <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {flowState.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Security Score: {flowState.securityScore}/100
            </div>
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
      </>
    );
  }

  // Show error if user is not authenticated (no recovery session)
  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Invalid Reset Link</CardTitle>
          <CardDescription className="text-center">
            You must access this page from a password reset email link. The link may have expired or is invalid.
          </CardDescription>
        </CardHeader>
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
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-green-500" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">Set a New Password</CardTitle>
        <CardDescription className="text-center">
          Security validation complete. Please enter your new password below.
        </CardDescription>
        
        {/* Security Status Indicator */}
        {flowState && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle className="h-4 w-4" />
              <span>Secure recovery session verified</span>
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              Security Score: {flowState.securityScore}/100 | Flow: {flowState.flowStage}
            </div>
          </div>
        )}
        
        {/* Show warnings if any */}
        {flowState && flowState.warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
              <AlertCircle className="h-4 w-4" />
              <span>Security Notes:</span>
            </div>
            <ul className="list-disc list-inside text-xs text-yellow-600 dark:text-yellow-400 mt-1 ml-4">
              {flowState.warnings.slice(0, 3).map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </CardHeader>
      
      <form onSubmit={handlePasswordReset}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your new password"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your new password"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating...' : 'Set New Password'}
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