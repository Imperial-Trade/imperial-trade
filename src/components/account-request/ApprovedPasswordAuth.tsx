import React, { useState } from "react";
import { CheckCircle2, Loader2, Sparkles, Lock, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Confetti from "react-confetti";
import { useWindowSize } from "@/hooks/useWindowSize";

interface ApprovedPasswordAuthProps {
  accountRequest: any;
}

export const ApprovedPasswordAuth: React.FC<ApprovedPasswordAuthProps> = ({ 
  accountRequest 
}) => {
  const { width, height } = useWindowSize();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    try {
      // Step 1: Create the auth user with their password
      const { data, error: createError } = await supabase.functions.invoke('create-approved-account', {
        body: {
          email: accountRequest.email,
          accountRequestId: accountRequest.id,
          password: password,
        }
      });

      if (createError || !data?.success) {
        console.error("Account creation error:", createError || data?.error);
        
        // Handle specific error cases
        if (data?.error?.includes('Invalid password')) {
          toast.error("Incorrect password. Please try again with your signup password.");
        } else if (data?.error?.includes('not found') || data?.error?.includes('not approved')) {
          toast.error("Account request not found or not approved. Please contact support.");
        } else {
          toast.error(data?.error || "Failed to activate account. Please contact support.");
        }
        
        setIsAuthenticating(false);
        return;
      }

      console.log('✅ Auth user created successfully');

      // Step 2: Immediately sign in with the same password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: accountRequest.email.toLowerCase().trim(),
        password: password,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        toast.error("Account created but login failed. Please sign in manually.");
        setIsAuthenticating(false);
        navigate('/signin');
        return;
      }

      console.log('✅ Authentication successful!');
      
      // Show success and redirect
      toast.success("Welcome! Your account is now active.");
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard/home');
      }, 1500);
      
    } catch (error: any) {
      console.error("Password authentication error:", error);
      toast.error("An unexpected error occurred. Please try again or contact support.");
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

          {/* Enter Password Section */}
          <div className="space-y-4 pt-2">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-green-400" />
              </div>
              
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-semibold text-white">
                  Your Account is Ready!
                </h3>
                <p className="text-sm text-gray-300">
                  Enter your password to activate and login
                </p>
              </div>

              <form onSubmit={handlePasswordAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="bg-white border-gray-300 text-gray-900"
                    required
                    disabled={isAuthenticating}
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isAuthenticating || !password.trim()}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Activating Account...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Activate Account & Login
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center text-sm text-gray-400">
                <p>Use the password you created during signup</p>
              </div>
            </div>

            <div className="text-center text-sm text-gray-400 space-y-1">
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
