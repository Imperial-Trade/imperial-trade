import React, { useState } from "react";
import { Crown } from "lucide-react";
import { useSimplifiedSignup } from "@/hooks/useSimplifiedSignup";
import { SimplifiedSignupForm } from "@/components/account-request/SimplifiedSignupForm";

import { AdvancedTypingEffect } from "@/components/account-request/AdvancedTypingEffect";
import { SuccessMessage } from "@/components/account-request/SuccessMessage";
import { GlassCard } from "@/components/account-request/GlassCard";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { toast } from "sonner";
export default function AccountRequestPage() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const {
    handleEmailSignup,
    handleFacebookSignup,
    isSubmitting,
    canSubmit
  } = useSimplifiedSignup();
  const handleFormSubmit = async (data: any) => {
    const result = await handleEmailSignup(data);
    if (result.success) {
      toast.success("Account request submitted successfully!");
      setSubmittedEmail(data.email);
      setShowSuccess(true);
    } else {
      toast.error(result.error || "Failed to submit account request");
    }
  };
  return <>
      {/* Video Background */}
      <div className="fixed inset-0 w-screen h-screen overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover dark:brightness-[0.4] brightness-[0.7] transition-all duration-300"
        >
          <source src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </div>
      
      {/* Top Right Header - Logo and Theme Toggle */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-4">
        
        <ThemeToggle />
      </div>

      <div className="min-h-screen flex">
        {/* Left Side - Signup Form */}
        <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-sm">
            {showSuccess ? <SuccessMessage email={submittedEmail} /> : <GlassCard>
                <div className="text-left mb-8">
                  <h1 className="text-3xl font-bold tracking-tight text-gray-100">
                    Create your account
                  </h1>
                </div>
                <ErrorBoundary componentName="Simplified Signup Form">
                  <SimplifiedSignupForm onSubmit={handleFormSubmit} onFacebookSignup={handleFacebookSignup} isSubmitting={isSubmitting} canSubmit={canSubmit} />
                </ErrorBoundary>
              </GlassCard>}
          </div>
        </div>

        {/* Right Side - Typing Effect */}
        <div className="hidden md:flex md:w-1/2 lg:w-3/5 items-center justify-center p-8">
          <AdvancedTypingEffect />
        </div>
      </div>
    </>;
}