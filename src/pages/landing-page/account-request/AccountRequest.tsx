import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Search, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAccountRequestForm } from "@/hooks/useAccountRequestForm";
import { StatusMessage } from "@/components/account-request/StatusMessage";
import { AccountRequestForm } from "@/components/account-request/AccountRequestForm";
import { TradingBackground } from "@/components/account-request/TradingBackground";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";

export default function AccountRequestPage() {
  const [status, setStatus] = useState({
    type: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { form, onSubmit, canSubmit } = useAccountRequestForm();
  const navigate = useNavigate();

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setStatus({
        type: "",
        message: "",
      });

      const result = await onSubmit(data);
      if (result.success) {
        setStatus({
          type: "success",
          message:
            "Your request has been submitted successfully! Redirecting to status page...",
        });
        setTimeout(() => {
          navigate("/account-request-status");
        }, 2000);
      } else {
        setStatus({
          type: "error",
          message:
            result.error ||
            "There was an error submitting your request. Please try again.",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message:
          "There was an unexpected error submitting your request. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <Card className="backdrop-blur-xl bg-background/95 border border-border/50 shadow-xl">
            <CardHeader className="text-center space-y-4 px-4 sm:px-6">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Join Our Community</h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-2">
                  Request access to our exclusive trading platform and education content.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 px-4 sm:px-6">
              <ErrorBoundary fallback={<div>Error loading form</div>}>
                <AccountRequestForm
                  form={form}
                  onSubmit={handleFormSubmit}
                  isSubmitting={isSubmitting}
                  canSubmit={canSubmit}
                />
              </ErrorBoundary>

              <ErrorBoundary fallback={<div>Error loading status</div>}>
                <StatusMessage
                  type={status.type as "success" | "error" | ""}
                  message={status.message}
                />
              </ErrorBoundary>

              <div className="space-y-3 pt-4 border-t border-border/20">
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] touch-manipulation"
                  onClick={() => navigate('/account-request-status')}
                >
                  <Search className="h-4 w-4 mr-2 flex-shrink-0" />
                  Check Request Status
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full min-h-[44px] touch-manipulation"
                  onClick={() => navigate('/signin')}
                >
                  <LogIn className="h-4 w-4 mr-2 flex-shrink-0" />
                  Already have access? Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Background - Hidden on mobile, visible on large screens */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <TradingBackground />
        
        {/* Overlay Content */}
        <div className="absolute inset-0 bg-gradient-to-l from-background/80 to-transparent"></div>
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-foreground">
              Elite Trading Platform
            </h2>
            <p className="text-lg text-muted-foreground max-w-md">
              Access professional-grade trading signals, educational content, and live sessions from verified traders.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">For corporate inquiries:</p>
              <p className="font-medium text-foreground">partnerships@imperialtrading.com</p>
            </div>
            
            <div className="text-xs text-muted-foreground border-t border-border/20 pt-4">
              <p>© 2024 Imperial Trading. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Footer Info */}
      <div className="lg:hidden px-4 py-6 bg-muted/30 border-t border-border/20">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            For corporate inquiries: partnerships@imperialtrading.com
          </p>
          <p className="text-xs text-muted-foreground">
            © 2024 Imperial Trading. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
