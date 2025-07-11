
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAccountRequestForm } from "@/hooks/useAccountRequestForm";
import { BrandHeader } from "@/components/account-request/BrandHeader";
import { VideoBackground } from "@/components/account-request/VideoBackground";
import { StatusMessage } from "@/components/account-request/StatusMessage";
import { AccountRequestForm } from "@/components/account-request/AccountRequestForm";
import { PageStyles } from "@/components/account-request/PageStyles";
import { FormInputStyles } from "@/components/account-request/FormInputStyles";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";

export default function AccountRequestPage() {
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { form, onSubmit, canSubmit } = useAccountRequestForm();
  const navigate = useNavigate();

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setStatus({ type: "", message: "" }); // Clear previous status
      
      console.log("Form submission started with data:", data);
      
      const result = await onSubmit(data);
      
      if (result.success) {
        // Only navigate on successful submission
        setStatus({
          type: "success",
          message: "Your request has been submitted successfully! Redirecting to status page...",
        });
        
        // Small delay to show success message before navigation
        setTimeout(() => {
          navigate("/account-request-status");
        }, 2000);
      } else {
        // Stay on current page and show error
        setStatus({
          type: "error",
          message: result.error || "There was an error submitting your request. Please try again.",
        });
        console.error("Form submission failed:", result.error);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setStatus({
        type: "error",
        message: "There was an unexpected error submitting your request. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      <ErrorBoundary componentName="Video Background">
        <VideoBackground />
      </ErrorBoundary>

      <div className="relative z-20 max-w-2xl w-full">
        <ErrorBoundary componentName="Brand Header">
          <BrandHeader />
        </ErrorBoundary>

        <Card className="glass-effect border-default">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary text-center">
              Request Community Access
            </CardTitle>
            <p className="text-secondary text-center text-white">
              Fill out the form below. An admin will review your request
              shortly.
            </p>
          </CardHeader>
          <CardContent>
            <ErrorBoundary componentName="Status Message">
              <StatusMessage
                type={status.type as "success" | "error" | ""}
                message={status.message}
              />
            </ErrorBoundary>

            {status.type !== "success" && (
              <ErrorBoundary componentName="Account Request Form">
                <AccountRequestForm
                  form={form}
                  onSubmit={handleFormSubmit}
                  isSubmitting={isSubmitting}
                  canSubmit={canSubmit}
                />
              </ErrorBoundary>
            )}

            <div className="pt-4 space-y-3 grid grid-cols">
              <Link to="/account-request-status">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white/80 hover:bg-white/10"
                >
                  Check Request Status
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>

              <Link to="/signin">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white/80 hover:bg-white/10"
                >
                  Already Have Access? Sign In
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
      
      <ErrorBoundary componentName="Form Input Styles">
        <FormInputStyles />
      </ErrorBoundary>
    </div>
  );
}
