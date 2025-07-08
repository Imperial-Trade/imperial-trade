
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useLoginForm } from "@/hooks/useLoginForm";
import { BrandHeader } from "@/components/account-request/BrandHeader";
import { VideoBackground } from "@/components/account-request/VideoBackground";
import { StatusMessage } from "@/components/account-request/StatusMessage";
import { LoginForm } from "@/components/login/LoginForm";
import { PageStyles } from "@/components/account-request/PageStyles";

export default function LoginPage() {
  const [status, setStatus] = useState({ type: "", message: "" });
  const { form, onSubmit, canSubmit, isSubmitting } = useLoginForm();
  const navigate = useNavigate();

  const handleFormSubmit = async (data: any) => {
    try {
      // Login logic will be handled in the hook
      await onSubmit(data);
      
      // Redirect to dashboard after successful login
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      setStatus({
        type: "error",
        message: "Login failed. Please check your credentials and try again.",
      });
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-background overflow-hidden">
      <VideoBackground />

      <div className="relative z-20 max-w-md w-full">
        <BrandHeader />

        <Card className="glass-effect border-default">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary text-center">
              Welcome Back
            </CardTitle>
            <p className="text-secondary text-center text-white">
              Sign in to access your Imperial Trading account
            </p>
          </CardHeader>
          <CardContent>
            <StatusMessage type={status.type as "success" | "error" | ""} message={status.message} />

            {status.type !== "success" && (
              <LoginForm
                form={form}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                canSubmit={canSubmit}
              />
            )}

            <div className="pt-4 space-y-3">
              <Link to="/account-request">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white/80 hover:bg-white/10"
                >
                  Need an Account? Request Access
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              
              <Link to="/account-request-status">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white/80 hover:bg-white/10"
                >
                  Check Request Status
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <PageStyles />
    </div>
  );
}
