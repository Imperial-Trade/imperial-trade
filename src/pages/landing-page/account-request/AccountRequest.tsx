
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAccountRequestForm } from "@/hooks/useAccountRequestForm";
import { AccountRequest } from "@/api/entities";
import { BrandHeader } from "@/components/account-request/BrandHeader";
import { VideoBackground } from "@/components/account-request/VideoBackground";
import { StatusMessage } from "@/components/account-request/StatusMessage";
import { AccountRequestForm } from "@/components/account-request/AccountRequestForm";
import { PageStyles } from "@/components/account-request/PageStyles";

export default function AccountRequestPage() {
  const [status, setStatus] = useState({ type: "", message: "" });
  const { form, onSubmit, canSubmit, isSubmitting } = useAccountRequestForm();
  const navigate = useNavigate();

  const handleFormSubmit = async (data: any) => {
    try {
      await AccountRequest.create(data);
      
      // Redirect to status page after successful submission
      navigate("/account-request-status");
    } catch (error) {
      console.error("Failed to submit account request:", error);
      setStatus({
        type: "error",
        message: "There was an error submitting your request. Please try again later.",
      });
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-background overflow-hidden">
      <VideoBackground />

      <div className="relative z-20 max-w-2xl w-full">
        <BrandHeader />

        <Card className="glass-effect border-default">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary text-center">
              Request Community Access
            </CardTitle>
            <p className="text-secondary text-center text-white">
              Fill out the form below. An admin will review your request shortly.
            </p>
          </CardHeader>
          <CardContent>
            <StatusMessage type={status.type as "success" | "error" | ""} message={status.message} />

            {status.type !== "success" && (
              <AccountRequestForm
                form={form}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                canSubmit={canSubmit}
              />
            )}

            <div className="pt-4 space-y-3">
              <Link to="/account-request-status">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white/80 hover:bg-white/10"
                >
                  Check Request Status
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              
              <Link to={createPageUrl("AccessPortal")}>
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white/80 hover:bg-white/10"
                >
                  Go to Login
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
