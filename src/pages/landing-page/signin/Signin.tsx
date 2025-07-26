import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLoginForm } from "@/hooks/useLoginForm";
import { BrandHeader } from "@/components/account-request/BrandHeader";
import { VideoBackground } from "@/components/account-request/VideoBackground";
import { StatusMessage } from "@/components/account-request/StatusMessage";
import { LoginForm } from "@/components/login/LoginForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PageStyles } from "@/components/account-request/PageStyles";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
export default function SigninPage() {
  const [status, setStatus] = useState({
    type: "",
    message: ""
  });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const {
    form,
    onSubmit,
    canSubmit,
    isSubmitting
  } = useLoginForm();
  const navigate = useNavigate();
  const handleFormSubmit = async (data: any) => {
    try {
      // Login logic will be handled in the hook
      await onSubmit(data);

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
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Video */}
      <VideoBackground />
      
      {/* Brand Header */}
      <BrandHeader />

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20">
        <Card className="w-full max-w-md backdrop-blur-xl bg-background/95 border border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-4 px-4 sm:px-6">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                <LogIn className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Welcome Back</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Sign in to access your trading dashboard
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-6">
            {!showForgotPassword ? (
              <ErrorBoundary fallback={<div>Error loading login form</div>}>
                <LoginForm 
                  form={form} 
                  onSubmit={handleFormSubmit} 
                  isSubmitting={isSubmitting} 
                  canSubmit={canSubmit}
                  onForgotPassword={() => setShowForgotPassword(true)}
                />
              </ErrorBoundary>
            ) : (
              <ErrorBoundary fallback={<div>Error loading forgot password form</div>}>
                <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
              </ErrorBoundary>
            )}

            <ErrorBoundary fallback={<div>Error loading status</div>}>
              <StatusMessage 
                type={status.type as "success" | "error" | ""} 
                message={status.message} 
              />
            </ErrorBoundary>

            {!showForgotPassword && (
              <div className="text-center">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline min-h-[44px] flex items-center justify-center w-full touch-manipulation"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-border/20">
              <Button
                variant="outline"
                className="w-full min-h-[44px] touch-manipulation"
                onClick={() => navigate('/account-request')}
              >
                <UserPlus className="h-4 w-4 mr-2 flex-shrink-0" />
                Need an Account? Request Access
              </Button>
              
              <Button
                variant="ghost"
                className="w-full min-h-[44px] touch-manipulation"
                onClick={() => navigate('/account-request-status')}
              >
                <Search className="h-4 w-4 mr-2 flex-shrink-0" />
                Check Request Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Page Styles */}
      <PageStyles />
    </div>
  );
}