
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Crown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAccountRequestForm } from "@/hooks/useAccountRequestForm";
import { StatusMessage } from "@/components/account-request/StatusMessage";
import { AccountRequestForm } from "@/components/account-request/AccountRequestForm";
import { TradingBackground } from "@/components/account-request/TradingBackground";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { AccountRequestFunnel } from "@/components/analytics/FunnelTracker";
import { usePostHogTracking } from "@/hooks/usePostHogTracking";

export default function AccountRequestPage() {
  const [status, setStatus] = useState({
    type: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { trackAuth } = usePostHogTracking();
  const {
    form,
    onSubmit,
    canSubmit
  } = useAccountRequestForm();
  const navigate = useNavigate();

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setStatus({
        type: "",
        message: ""
      });
      
      const result = await onSubmit(data);
      if (result.success) {
        // Track successful account request
        trackAuth.accountRequest(data.account_type);
        
        setStatus({
          type: "success",
          message: "Your request has been submitted successfully! Redirecting to status page..."
        });
        setTimeout(() => {
          navigate("/account-request-status");
        }, 2000);
      } else {
        setStatus({
          type: "error",
          message: result.error || "There was an error submitting your request. Please try again."
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "There was an unexpected error submitting your request. Please try again later."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccountRequestFunnel step="page_visit">
      <div className="min-h-screen flex">
        {/* Left Side - Dark with Form */}
        <div className="w-1/2 bg-white flex items-center justify-center px-8 py-24">
          <div className="w-full max-w-sm">
            {/* Form Card */}
            <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
              <CardHeader className="bg-slate-50">
                <CardTitle className="text-xl font-semibold text-center text-amber-400">
                  Request Community Access
                </CardTitle>
                <p className="text-center text-sm text-slate-900">
                  Fill out the form below. An admin will review your request shortly.
                </p>
              </CardHeader>
              <CardContent className="bg-slate-50 rounded-none">
                <ErrorBoundary componentName="Status Message">
                  <StatusMessage type={status.type as "success" | "error" | ""} message={status.message} />
                </ErrorBoundary>

                {status.type !== "success" && (
                  <AccountRequestFunnel step="form_start">
                    <ErrorBoundary componentName="Account Request Form">
                      <AccountRequestForm 
                        form={form} 
                        onSubmit={handleFormSubmit} 
                        isSubmitting={isSubmitting} 
                        canSubmit={canSubmit} 
                      />
                    </ErrorBoundary>
                  </AccountRequestFunnel>
                )}

                <div className="pt-4 space-y-3">
                  <Link to="/account-request-status">
                    <Button variant="outline" className="w-full border-gray-600 bg-slate-50 text-slate-950">
                      Check Request Status
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>

                  <Link to="/signin">
                    <Button variant="outline" className="w-full border-gray-600 text-gray-950 bg-slate-50">
                      Already Have Access? Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Trading Background */}
        <div className="w-1/2 bg-white relative overflow-hidden flex items-center justify-center">
          <TradingBackground />
          
          {/* Content overlay */}
          <div className="relative z-10 text-center">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
              Imperial
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Professional Trading Community
            </p>
            
            {/* Contact info */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 max-w-sm mx-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Corporate Inquiry Form
              </h3>
              <p className="text-sm text-gray-600">
                Can't get access to your account? 
                <Link to="/account-request-status" className="text-teal-600 hover:underline ml-1">
                  Contact Us
                </Link>
              </p>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="absolute bottom-4 right-6 text-xs text-gray-500">
            © Copyright 2025 Imperial. All Rights Reserved
          </div>
        </div>
      </div>
    </AccountRequestFunnel>
  );
}
