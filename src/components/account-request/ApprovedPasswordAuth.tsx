import React, { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Sparkles, Lock, Key, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Confetti from "react-confetti";
import { useWindowSize } from "@/hooks/useWindowSize";

interface ApprovedPasswordAuthProps {
  accountRequest: {
    id: string;
    email: string;
    full_name: string;
    password_hash: string | null;
    status: string;
    account_type?: string;
  };
}

export const ApprovedPasswordAuth: React.FC<ApprovedPasswordAuthProps> = ({ 
  accountRequest 
}) => {
  const { width, height } = useWindowSize();
  const navigate = useNavigate();
  
  // Password states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // UI states
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [checkingAuthUser, setCheckingAuthUser] = useState(true);
  const [checkError, setCheckError] = useState<string | null>(null);
  
  // Activation mode
  const [isFirstTimeActivation, setIsFirstTimeActivation] = useState(false);
  const [authUserExists, setAuthUserExists] = useState(false);
  const [isAlreadyActivated, setIsAlreadyActivated] = useState(false);
  const [isCurrentlyAuthenticated, setIsCurrentlyAuthenticated] = useState(false);

  // Check Auth user status on mount with aggressive retry and multiple detection methods
  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;
    let retryAttempts = 0;
    const MAX_RETRIES = 3;
    
    // Set up auth listener FIRST (outside retry logic)
    const { data: authData } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log('🔔 [AUTH LISTENER] Auth state change:', event, 'Email:', session?.user?.email);
      
      if (session?.user) {
        const sessionEmail = session.user.email?.toLowerCase().trim();
        const requestEmail = accountRequest.email.toLowerCase().trim();
        
        console.log('📧 [AUTH LISTENER] Email comparison:', { sessionEmail, requestEmail });
        
        if (sessionEmail === requestEmail) {
          console.log('✅ [AUTH LISTENER] Authenticated user detected - marking as already activated');
          setIsCurrentlyAuthenticated(true);
          setIsAlreadyActivated(true);
          setCheckingAuthUser(false);
        }
      }
    });
    
    authSubscription = authData.subscription;
    
    const checkAuthUserStatus = async (attempt = 1) => {
      try {
        retryAttempts = attempt;
        console.log(`🔍 [ATTEMPT ${attempt}/${MAX_RETRIES}] Checking auth status for: ${accountRequest.email}`);
        
        // Strategy 1: Check getSession()
        const { data: { session: sessionData } } = await supabase.auth.getSession();
        console.log(`📊 [ATTEMPT ${attempt}] getSession result:`, sessionData ? 'Found' : 'Not found', sessionData?.user?.email);
        
        if (sessionData?.user) {
          const sessionEmail = sessionData.user.email?.toLowerCase().trim();
          const requestEmail = accountRequest.email.toLowerCase().trim();
          
          console.log(`📧 [ATTEMPT ${attempt}] Email comparison:`, { sessionEmail, requestEmail, match: sessionEmail === requestEmail });
          
          if (sessionEmail === requestEmail) {
            console.log(`✅ [ATTEMPT ${attempt}] Session found - user is authenticated!`);
            setIsCurrentlyAuthenticated(true);
            setIsAlreadyActivated(true);
            setCheckingAuthUser(false);
            return;
          }
        }
        
        // Strategy 2: Check getUser() as fallback
        const { data: { user: userData } } = await supabase.auth.getUser();
        console.log(`👤 [ATTEMPT ${attempt}] getUser result:`, userData ? 'Found' : 'Not found', userData?.email);
        
        if (userData) {
          const userEmail = userData.email?.toLowerCase().trim();
          const requestEmail = accountRequest.email.toLowerCase().trim();
          
          console.log(`📧 [ATTEMPT ${attempt}] User email comparison:`, { userEmail, requestEmail, match: userEmail === requestEmail });
          
          if (userEmail === requestEmail) {
            console.log(`✅ [ATTEMPT ${attempt}] User found - authenticated!`);
            setIsCurrentlyAuthenticated(true);
            setIsAlreadyActivated(true);
            setCheckingAuthUser(false);
            return;
          }
        }
        
        // Retry logic with exponential backoff
        if (attempt < MAX_RETRIES) {
          const delayMs = attempt * 1500; // 1.5s, 3s, 4.5s
          console.log(`⏳ [ATTEMPT ${attempt}] No session found, retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          if (mounted) {
            return await checkAuthUserStatus(attempt + 1);
          }
        }
        
        console.log(`➡️ [ATTEMPT ${attempt}] No active session after ${MAX_RETRIES} attempts, checking profile...`);
        
        // Check if profile is already active
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('account_status, email')
          .eq('email', accountRequest.email.toLowerCase().trim())
          .maybeSingle();
        
        console.log('📋 [PROFILE CHECK] Email:', accountRequest.email);
        console.log('📋 [PROFILE CHECK] Profile data:', profileData);
        console.log('📋 [PROFILE CHECK] Profile error:', profileError);
        console.log('📋 [PROFILE CHECK] Account status:', profileData?.account_status);
        
        if (!profileError && profileData?.account_status === 'active') {
          console.log('✅ [PROFILE CHECK] Profile is active - setting isAlreadyActivated = true');
          setIsAlreadyActivated(true);
          return;
        } else {
          console.log('⚠️ [PROFILE CHECK] Profile NOT active or error occurred');
          console.log('⚠️ [PROFILE CHECK] Status:', profileData?.account_status);
          console.log('⚠️ [PROFILE CHECK] Error:', profileError?.message);
        }
        
        // Check if Auth user exists
        const { data, error } = await supabase.functions.invoke('check-user-existence', {
          body: { email: accountRequest.email }
        });

        if (error) {
          throw new Error(error.message);
        }

        const exists = data?.userExists || false;
        setAuthUserExists(exists);
        
        console.log('🔐 Auth user exists:', exists);

        // Determine if first-time activation needed
        const hasIncompatibleHash = 
          !accountRequest.password_hash || 
          !accountRequest.password_hash.match(/^[0-9a-f]{64}$/);
        
        const needsFirstTimeActivation = hasIncompatibleHash && !exists;
        setIsFirstTimeActivation(needsFirstTimeActivation);
        
        console.log('✅ Auth check complete:', {
          authUserExists: exists,
          hasCompatibleHash: !hasIncompatibleHash,
          isFirstTimeActivation: needsFirstTimeActivation
        });

      } catch (error: any) {
        console.error('❌ Failed to check auth user:', error);
        
        setCheckError(error.message || 'Failed to verify account status');
        toast.error(
          "Unable to verify account status. Please refresh the page or contact support.",
          { duration: 8000 }
        );
      } finally {
        if (mounted) {
          setCheckingAuthUser(false);
        }
      }
    };

    checkAuthUserStatus();
    
    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [accountRequest]);

  // ✅ FIX #4: Complete password validation matching signup schema
  const validatePassword = (password: string, confirmPassword?: string): { valid: boolean; error?: string } => {
    if (password.length < 12) {
      return { valid: false, error: "Password must be at least 12 characters" };
    }

    if (password.length > 128) {
      return { valid: false, error: "Password must be less than 128 characters" };
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: "Password must contain at least one uppercase letter" };
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, error: "Password must contain at least one lowercase letter" };
    }

    if (!/[0-9]/.test(password)) {
      return { valid: false, error: "Password must contain at least one number" };
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return { valid: false, error: "Password must contain at least one special character" };
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return { valid: false, error: "Passwords don't match" };
    }

    return { valid: true };
  };

  // First-time activation handler
  const handleFirstTimeActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    const validation = validatePassword(password, confirmPassword);
    if (!validation.valid) {
      toast.error(validation.error);
      setIsAuthenticating(false);
      return;
    }

    try {
      console.log('🆕 Starting first-time activation for:', accountRequest.email);

      const { data, error } = await supabase.functions.invoke('unified-account-approval', {
        body: {
          requestId: accountRequest.id,
          status: 'approved',
          activationPassword: password
        }
      });

      if (error) {
        console.error('❌ Activation failed:', error);
        toast.error(error.message || "Failed to activate account. Please contact support.");
        setIsAuthenticating(false);
        return;
      }

      if (!data?.success) {
        console.error('❌ Activation unsuccessful:', data?.error);
        toast.error(data?.error || "Failed to activate account.");
        setIsAuthenticating(false);
        return;
      }

      console.log('✅ Auth user created via first-time activation');

      // Auto-login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: accountRequest.email.toLowerCase().trim(),
        password: password,
      });

      if (signInError) {
        console.error('❌ Auto-login failed:', signInError);
        toast.success("Account activated! Please sign in on the login page.");
        setTimeout(() => navigate('/signin'), 2000);
        return;
      }

      console.log('✅ Auto-login successful');
      toast.success("Welcome! Your account is now active.");
      setTimeout(() => navigate('/dashboard/home'), 1500);

    } catch (error: any) {
      console.error('💥 Unexpected error:', error);
      toast.error(error.message || "An unexpected error occurred.");
      setIsAuthenticating(false);
    }
  };

  // Normal password activation handler
  const handlePasswordActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    const validation = validatePassword(password);
    if (!validation.valid) {
      toast.error(validation.error);
      setIsAuthenticating(false);
      return;
    }

    // Detect incompatible hash format
    if (accountRequest.password_hash && 
        !accountRequest.password_hash.match(/^[0-9a-f]{64}$/)) {
      toast.error(
        "Your account was created with an old system. Please refresh the page to set a new password.",
        { duration: 8000 }
      );
      setIsAuthenticating(false);
      return;
    }

    try {
      console.log('🔐 Starting password activation for:', accountRequest.email);

      const { data, error } = await supabase.functions.invoke('unified-account-approval', {
        body: {
          requestId: accountRequest.id,
          status: 'approved',
          activationPassword: password
        }
      });

      if (error) {
        console.error('❌ Activation failed:', error);
        toast.error(error.message);
        setIsAuthenticating(false);
        return;
      }

      if (!data?.success) {
        if (data?.error?.includes('Invalid password')) {
          toast.error("Incorrect password. Please use the password you created during signup.");
        } else if (data?.alreadyExists) {
          toast.success("Account already activated! Redirecting to login...");
          setTimeout(() => navigate('/signin'), 2000);
          return;
        } else {
          toast.error(data?.error || "Failed to activate account.");
        }
        setIsAuthenticating(false);
        return;
      }

      console.log('✅ Password verified, auth user created');

      // Auto-login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: accountRequest.email.toLowerCase().trim(),
        password: password,
      });

      if (signInError) {
        toast.success("Account activated! Please sign in on the login page.");
        setTimeout(() => navigate('/signin'), 2000);
        return;
      }

      toast.success("Welcome! Your account is now active.");
      setTimeout(() => navigate('/dashboard/home'), 1500);

    } catch (error: any) {
      console.error('💥 Unexpected error:', error);
      toast.error(error.message);
      setIsAuthenticating(false);
    }
  };

  // Hide confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // LOADING STATE
  if (checkingAuthUser) {
    return (
      <Card className="glass-effect shadow-2xl">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-lg text-gray-600">Checking account status...</p>
        </CardContent>
      </Card>
    );
  }

  // ERROR STATE
  if (checkError) {
    return (
      <Card className="glass-effect border-red-500/30 shadow-2xl">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="w-16 h-16 text-red-600" />
          <h3 className="text-xl font-bold text-gray-900">Connection Error</h3>
          <p className="text-gray-600 text-center max-w-md">
            Unable to verify your account status. Please refresh the page or contact support if the problem persists.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ALREADY ACTIVATED STATE
  if (isAlreadyActivated) {
    return (
      <>
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={300}
            gravity={0.2}
          />
        )}

        <Card className="glass-effect border-green-500/30 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-white">
                Account Already Activated!
              </CardTitle>
              <p className="text-green-400 text-lg font-semibold">
                {isCurrentlyAuthenticated 
                  ? `You're already signed in, ${accountRequest.full_name}! 🎉`
                  : `Welcome back, ${accountRequest.full_name}! ✨`
                }
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 space-y-4 text-center">
              <p className="text-white text-lg">
                {isCurrentlyAuthenticated 
                  ? 'Your account is active and you are currently signed in!'
                  : 'Your account is already active and ready to use!'
                }
              </p>
              <p className="text-gray-300 text-sm">
                {isCurrentlyAuthenticated 
                  ? 'You can access your dashboard right away.'
                  : 'No further activation is needed. Please sign in to access your dashboard.'
                }
              </p>
            </div>

            <div className="bg-surface/20 rounded-lg p-4 space-y-3 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Email:</span>
                <span className="text-white font-medium">{accountRequest.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Status:</span>
                <span className="text-green-400 font-medium">✓ Active</span>
              </div>
              {isCurrentlyAuthenticated && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Session:</span>
                  <span className="text-green-400 font-medium">✓ Authenticated</span>
                </div>
              )}
            </div>

            {isCurrentlyAuthenticated ? (
              <Button
                onClick={() => navigate('/dashboard/home')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 h-12"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/signin')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 h-12"
              >
                <Lock className="w-4 h-4 mr-2" />
                Sign In to Your Account
              </Button>
            )}

            {isCurrentlyAuthenticated && (
              <p className="text-center text-sm text-gray-400">
                Not you?{' '}
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/signin');
                  }}
                  className="text-green-400 hover:text-green-300 underline"
                >
                  Sign out and sign in with different account
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  // FIRST-TIME ACTIVATION UI
  if (isFirstTimeActivation) {
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
                  Account Approved!
                </CardTitle>
                <Sparkles className="w-5 h-5 text-yellow-400 animate-bounce" />
              </div>
              <p className="text-green-400 text-lg font-semibold">
                Welcome, {accountRequest.full_name}! 🎉
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-200 text-center">
                Set your password to activate your account and get started
              </p>
            </div>

            <form onSubmit={handleFirstTimeActivation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 bg-white border-gray-300 text-gray-900"
                    required
                    disabled={isAuthenticating}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Minimum 12 characters, include uppercase, lowercase, number, and special character
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="pl-10 bg-white border-gray-300 text-gray-900"
                    required
                    disabled={isAuthenticating}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isAuthenticating || !password || !confirmPassword}
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
                    Set Password & Activate
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </>
    );
  }

  // NORMAL PASSWORD ACTIVATION UI
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
                Account Approved!
              </CardTitle>
              <Sparkles className="w-5 h-5 text-yellow-400 animate-bounce" />
            </div>
            <p className="text-green-400 text-lg font-semibold">
              Welcome back, {accountRequest.full_name}! 🎉
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-surface/20 rounded-lg p-4 space-y-3 border border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Email:</span>
              <span className="text-white font-medium">{accountRequest.email}</span>
            </div>
          </div>

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

              <form onSubmit={handlePasswordActivation} className="space-y-4">
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
          </div>
        </CardContent>
      </Card>
    </>
  );
};
