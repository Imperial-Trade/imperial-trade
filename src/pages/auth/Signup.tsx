
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSignupForm } from "@/hooks/useSignupForm";
import { BrandHeader } from "@/components/account-request/BrandHeader";
import { VideoBackground } from "@/components/account-request/VideoBackground";
import { StatusMessage } from "@/components/account-request/StatusMessage";
import { SignupForm } from "@/components/auth/SignupForm";
import { PageStyles } from "@/components/account-request/PageStyles";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";

export default function SignupPage() {
  const [status, setStatus] = useState({
    type: "",
    message: ""
  });
  const {
    form,
    onSubmit,
    isSubmitting,
  } = useSignupForm();
  const navigate = useNavigate();

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data);
      setStatus({
        type: "success",
        message: "Registration successful! Please check your email to verify your account."
      });
      
      // Redirect to signin after successful registration
      setTimeout(() => {
        navigate("/signin");
      }, 3000);
    } catch (error) {
      console.error("Signup failed:", error);
      setStatus({
        type: "error",
        message: "Registration failed. Please try again."
      });
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <ErrorBoundary componentName="Video Background">
        <VideoBackground />
      </ErrorBoundary>

      <div className="relative z-20 max-w-md w-full mx-auto">
        <ErrorBoundary componentName="Brand Header">
          <BrandHeader />
        </ErrorBoundary>

        <Card className="glass-effect border-default shadow-2xl">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center text-lime-200">
              Create Your Account
            </CardTitle>
            <p className="text-center text-slate-50 text-sm sm:text-base">
              Join the Imperial Trading community
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <ErrorBoundary componentName="Status Message">
              <StatusMessage type={status.type as "success" | "error" | ""} message={status.message} />
            </ErrorBoundary>
            
            {status.type !== "success" && (
              <ErrorBoundary componentName="Signup Form">
                <SignupForm 
                  form={form} 
                  onSubmit={handleFormSubmit} 
                  isSubmitting={isSubmitting} 
                />
              </ErrorBoundary>
            )}

            <div className="pt-4 space-y-3">
              <Link to="/signin">
                <Button 
                  variant="outline" 
                  className="w-full min-h-[48px] border-white/20 text-white bg-black/20 hover:bg-white/20 active:bg-white/30 transition-all duration-200 active:scale-95 touch-manipulation"
                  aria-label="Already have an account? Sign in"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Already have an account? Sign In
                </Button>
              </Link>

              <Link to="/account-request">
                <Button 
                  variant="outline" 
                  className="w-full min-h-[48px] border-white/20 text-white bg-black/20 hover:bg-white/20 active:bg-white/30 transition-all duration-200 active:scale-95 touch-manipulation"
                  aria-label="Need special access? Request account"
                >
                  Need Special Access? Request Account
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
    </div>
  );
}
