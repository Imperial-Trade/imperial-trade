import React, { useState } from "react";
import { useSimplifiedSignup } from "@/hooks/useSimplifiedSignup";
import { SimplifiedSignupForm } from "@/components/account-request/SimplifiedSignupForm";
import { GradientBackground } from "@/components/account-request/GradientBackground";
import { AdvancedTypingEffect } from "@/components/account-request/AdvancedTypingEffect";
import { SuccessMessage } from "@/components/account-request/SuccessMessage";
import { GlassCard } from "@/components/account-request/GlassCard";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { toast } from "sonner";

export default function AccountRequestPage() {
  const [showSuccess, setShowSuccess] = useState(false);
  const { handleEmailSignup, handleFacebookSignup, isSubmitting, canSubmit } = useSimplifiedSignup();

  const handleFormSubmit = async (data: any) => {
    const result = await handleEmailSignup(data);
    
    if (result.success) {
      toast.success("Account request submitted successfully!");
      setShowSuccess(true);
    } else {
      toast.error(result.error || "Failed to submit account request");
    }
  };

  return (
    <>
      <GradientBackground />
      <div className="min-h-screen flex">
        {/* Left Side - Signup Form */}
        <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-sm">
            {showSuccess ? (
              <SuccessMessage />
            ) : (
              <GlassCard>
                <div className="text-left mb-8">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    Create your account
                  </h1>
                </div>
                <ErrorBoundary componentName="Simplified Signup Form">
                  <SimplifiedSignupForm
                    onSubmit={handleFormSubmit}
                    onFacebookSignup={handleFacebookSignup}
                    isSubmitting={isSubmitting}
                    canSubmit={canSubmit}
                  />
                </ErrorBoundary>
              </GlassCard>
            )}
          </div>
        </div>

        {/* Right Side - Typing Effect */}
        <div className="hidden md:flex md:w-1/2 lg:w-3/5 items-start justify-center pt-20 lg:pt-32 p-8">
          <AdvancedTypingEffect />
        </div>
      </div>
    </>
  );
}
