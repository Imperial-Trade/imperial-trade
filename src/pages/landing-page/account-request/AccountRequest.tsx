import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useSimplifiedSignup } from "@/hooks/useSimplifiedSignup";
import { SimplifiedSignupForm } from "@/components/account-request/SimplifiedSignupForm";
import { SecureBackground } from "@/components/account-request/SecureBackground";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { toast } from "sonner";

export default function AccountRequestPage() {
  const navigate = useNavigate();
  const { handleEmailSignup, handleFacebookSignup, isSubmitting, canSubmit } = useSimplifiedSignup();

  const handleFormSubmit = async (data: any) => {
    const result = await handleEmailSignup(data);
    
    if (result.success) {
      toast.success("Account request submitted! Redirecting...");
      setTimeout(() => {
        navigate("/account-request-status");
      }, 2000);
    } else {
      toast.error(result.error || "Failed to submit account request");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Signup Form */}
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="w-full max-w-md">
          {/* Form Card */}
          <Card className="bg-white/80 backdrop-blur-lg border-white/20 shadow-2xl rounded-3xl">
            <CardHeader className="px-6 sm:px-8 pt-8">
              <CardTitle className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-2">
                Create your account
              </CardTitle>
              <p className="text-center text-sm text-gray-600">
                Fill out the form below. An admin will review your request shortly.
              </p>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 pb-8">
              <ErrorBoundary componentName="Simplified Signup Form">
                <SimplifiedSignupForm
                  onSubmit={handleFormSubmit}
                  onFacebookSignup={handleFacebookSignup}
                  isSubmitting={isSubmitting}
                  canSubmit={canSubmit}
                />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Secure Background */}
      <div className="w-full lg:w-1/2 relative overflow-hidden min-h-[40vh] lg:min-h-screen">
        <SecureBackground />
      </div>
    </div>
  );
}
