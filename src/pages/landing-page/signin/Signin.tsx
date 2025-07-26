import React, { useState } from "react";
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
  return <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      <ErrorBoundary componentName="Video Background">
        <VideoBackground />
      </ErrorBoundary>

      <div className="relative z-20 max-w-md w-full">
        <ErrorBoundary componentName="Brand Header">
          <BrandHeader />
        </ErrorBoundary>

        <Card className="glass-effect border-default">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-lime-200">
              Welcome Back
            </CardTitle>
            <p className="text-center text-slate-50">
              Sign in to access your Imperial Trading account
            </p>
          </CardHeader>
          <CardContent>
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
                    canSubmit={canSubmit}
                    onForgotPassword={() => setShowForgotPassword(true)}
                  />
                )}
              </ErrorBoundary>
            )}

            <div className="pt-4 space-y-3 grid grid-cols">
              <Link to="/account-request">
                <Button variant="outline" className="w-full border-white/20 text-white bg-black/20 hover:bg-white/20 active:bg-white/30 transition-all duration-200 active:scale-95">
                  Need an Account? Request Access
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>

              <Link to="/account-request-status">
                <Button variant="outline" className="w-full border-white/20 text-white bg-black/20 hover:bg-white/20 active:bg-white/30 transition-all duration-200 active:scale-95">
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