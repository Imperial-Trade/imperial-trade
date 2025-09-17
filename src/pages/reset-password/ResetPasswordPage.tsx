import React from "react";
import { Link } from "react-router-dom";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { BrandHeader } from "@/components/account-request/BrandHeader";
import { VideoBackground } from "@/components/account-request/VideoBackground";
import { PageStyles } from "@/components/account-request/PageStyles";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ErrorBoundary componentName="Video Background">
        <VideoBackground />
      </ErrorBoundary>

      {/* Custom Header for Reset Password - Shows unauthenticated state */}
      <header className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-between px-6 bg-transparent">
        <Link
          to="/"
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <span className="text-lg">←</span>
          <span className="text-sm font-medium">Go back</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="flex gap-2">
            <Link to="/account-request">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Get Started
              </Button>
            </Link>
            <Link to="/signin">
              <Button
                size="sm"
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative z-20 max-w-md w-full">
          <ErrorBoundary componentName="Brand Header">
            <BrandHeader />
          </ErrorBoundary>

          <ErrorBoundary componentName="Reset Password Form">
            <ResetPasswordForm />
          </ErrorBoundary>
        </div>
      </div>

      <ErrorBoundary componentName="Page Styles">
        <PageStyles />
      </ErrorBoundary>
    </div>
  );
}