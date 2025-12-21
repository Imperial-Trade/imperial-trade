import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLoginForm } from "@/hooks/useLoginForm";
import { BrandHeader } from "@/components/account-request/BrandHeader";
import { VideoBackground } from "@/components/account-request/VideoBackground";
import { StatusMessage } from "@/components/account-request/StatusMessage";
import { LoginForm } from "@/components/login/LoginForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PageStyles } from "@/components/account-request/PageStyles";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { cleanupAuthState } from "@/utils/authUtils";
import { supabase } from "@/integrations/supabase/client";

export default function SigninPage() {
  const [status, setStatus] = useState({
    type: "",
    message: ""
  });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const {
    form,
    onSubmit,
    isSubmitting,
  } = useLoginForm();
  const navigate = useNavigate();

  // Clear auth state only if not coming from password reset flow
  useEffect(() => {
    const clearAuthOnSignin = async () => {
      // Check if we're in a password reset flow by looking at referrer or navigation state
      const isFromPasswordReset = window.document.referrer.includes('/reset-password') ||
                                  window.location.pathname.includes('reset-password') ||
                                  sessionStorage.getItem('password-reset-flow');
      
      if (isFromPasswordReset) {
        console.log('🔐 Skipping auth cleanup - coming from password reset flow');
        return;
      }
      
      console.log('🏠 Signin page loaded - clearing existing auth state');
      try {
        await supabase.auth.signOut({ scope: 'local' });
        cleanupAuthState();
      } catch (error) {
        console.warn('Error clearing auth state on signin:', error);
      }
    };
    
    clearAuthOnSignin();
  }, []);

  const handleFormSubmit = async (data: any) => {
    try {
      // Login logic will be handled in the hook
      await onSubmit(data);

      // Wait for auth context and roles to propagate
      console.log('✅ Login successful, waiting for auth state...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Redirect to dashboard after successful login
      navigate("/dashboard/home");
    } catch (error) {
      console.error("Login failed:", error);
      setStatus({
        type: "error",
        message: "Login failed. Please check your credentials and try again."
      });
    }
  };
  return <div 
      className="fixed inset-0 flex justify-center items-center p-4 sm:p-6"
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        position: 'fixed',
      }}
    >
      <ErrorBoundary componentName="Video Background">
        <VideoBackground />
      </ErrorBoundary>

      <div className="relative z-20 max-w-md w-full mx-auto" style={{ overflow: 'hidden' }}>
        <ErrorBoundary componentName="Brand Header">
          <BrandHeader />
        </ErrorBoundary>

        <Card className="glass-effect border-default shadow-2xl">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center text-lime-200">
              Welcome Back
            </CardTitle>
            <p className="text-center text-slate-50 text-sm sm:text-base">
              Sign in to access your Imperial Trading account
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <ErrorBoundary componentName="Status Message">
              <StatusMessage type={status.type as "success" | "error" | ""} message={status.message} />
            </ErrorBoundary>
            {status.type !== "success" && (
              <ErrorBoundary componentName="Auth Form">
                {showForgotPassword ? (
                  <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
                ) : (
                  <LoginForm 
                    form={form} 
                    onSubmit={handleFormSubmit} 
                    isSubmitting={isSubmitting} 
                    onForgotPassword={() => setShowForgotPassword(true)}
                  />
                )}
              </ErrorBoundary>
            )}

            <div className="pt-4 space-y-3">
              <Link to="/account-request">
                <Button 
                  variant="outline" 
                  className="w-full min-h-[48px] border-white/20 text-white bg-black/20 hover:bg-white/20 active:bg-white/30 transition-all duration-200 active:scale-95 touch-manipulation"
                  aria-label="Request new account access"
                >
                  Need an Account? Request Access
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>

              <Link to="/account-request-status">
                <Button 
                  variant="outline" 
                  className="w-full min-h-[48px] border-white/20 text-white bg-black/20 hover:bg-white/20 active:bg-white/30 transition-all duration-200 active:scale-95 touch-manipulation"
                  aria-label="Check your request status"
                >
                  Check Request Status
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <ErrorBoundary componentName="Page Styles">
        <PageStyles />
      </ErrorBoundary>
    </div>;
}