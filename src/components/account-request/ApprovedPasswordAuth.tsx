import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const navigate = useNavigate();
  const { width, height } = useWindowSize();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    setIsAuthenticating(true);

    try {
      // Authenticate with the password they created during signup
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: accountRequest.email,
        password: password,
      });

      if (authError) {
        console.error("Authentication error:", authError);
        
        // Provide helpful error messages
        if (authError.message.includes("Invalid login credentials")) {
          toast.error("Incorrect password. Please try again or contact support if you forgot your password.");
        } else {
          toast.error(authError.message || "Failed to sign in. Please try again.");
        }
        return;
      }

      if (authData.user) {
        toast.success(`Welcome back, ${accountRequest.full_name}!`);
        
        // Redirect to dashboard after successful login
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      }

    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsAuthenticating(false);
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

          {/* Sign In Form */}
          <div className="space-y-4 pt-2">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">
                Enter Your Password to Continue
              </h3>
              <p className="text-sm text-gray-400">
                Use the password you created when you submitted your account request
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  disabled={isAuthenticating}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isAuthenticating || !password.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 h-12"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In to Dashboard"
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-gray-400">
              <p>
                Forgot your password?{" "}
                <a 
                  href="/reset-password" 
                  className="text-green-400 hover:text-green-300 font-medium"
                >
                  Reset it here
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
