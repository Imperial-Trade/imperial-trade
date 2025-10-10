import React, { useState } from "react";
import { CheckCircle2, Mail, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { useWindowSize } from "@/hooks/useWindowSize";

interface ApprovedPasswordAuthProps {
  accountRequest: any;
}

export const ApprovedPasswordAuth: React.FC<ApprovedPasswordAuthProps> = ({ 
  accountRequest 
}) => {
  const { width, height } = useWindowSize();
  const [isResending, setIsResending] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  const handleResendEmail = async () => {
    setIsResending(true);

    try {
      // Call create-approved-account to resend password setup email
      const { data, error } = await supabase.functions.invoke('create-approved-account', {
        body: {
          email: accountRequest.email,
          accountRequestId: accountRequest.id,
          password: null, // Trigger password reset email
        }
      });

      if (error) {
        console.error("Error resending email:", error);
        toast.error("Failed to resend email. Please try again or contact support.");
        return;
      }

      toast.success("Password setup email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Resend email error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  // Hide confetti after 5 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      <Card className="glass-effect border-green-500/30 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400 animate-bounce" />
              <CardTitle className="text-3xl font-bold text-white">
                Congratulations!
              </CardTitle>
              <Sparkles className="w-5 h-5 text-yellow-400 animate-bounce" />
            </div>
            <p className="text-green-400 text-lg font-semibold">
              Your account has been approved! 🎉
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Account Details */}
          <div className="bg-surface/20 rounded-lg p-4 space-y-3 border border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Name:</span>
              <span className="text-white font-medium">{accountRequest.full_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Email:</span>
              <span className="text-white font-medium">{accountRequest.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Account Type:</span>
              <span className="text-white font-medium">
                {accountRequest.account_type === "user" ? "Standard Member" : "Educator / IB Partner"}
              </span>
            </div>
          </div>

          {/* Check Your Email Section */}
          <div className="space-y-4 pt-2">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-400" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">
                  Check Your Email
                </h3>
                <p className="text-sm text-gray-300">
                  We've sent a password setup link to:
                </p>
                <p className="text-base font-medium text-blue-400">
                  {accountRequest.email}
                </p>
              </div>

              <div className="space-y-2 text-sm text-gray-400">
                <p>📧 Click the link in your email to set your password</p>
                <p>🔍 Check your spam folder if you don't see it</p>
                <p>⏱️ The link expires in 24 hours</p>
              </div>

              <Button
                onClick={handleResendEmail}
                disabled={isResending}
                variant="outline"
                className="w-full border-blue-500/30 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Password Setup Email
                  </>
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-gray-400 space-y-1">
              <p>Need help?</p>
              <a 
                href="/contact" 
                className="text-green-400 hover:text-green-300 font-medium inline-flex items-center gap-1"
              >
                Contact Support
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
