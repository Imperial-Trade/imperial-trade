import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, CheckCircle } from 'lucide-react';

interface ApprovedPasswordAuthProps {
  accountRequest: {
    id: string;
    email: string;
    full_name: string;
    password_hash: string | null;
    status: string;
  };
}

export const ApprovedPasswordAuth: React.FC<ApprovedPasswordAuthProps> = ({ 
  accountRequest 
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isFirstTimeActivation, setIsFirstTimeActivation] = useState(false);
  const [authUserExists, setAuthUserExists] = useState(false);
  const [checkingAuthUser, setCheckingAuthUser] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // ============================================
  // ✅ NEW: Check if this is first-time activation
  // ============================================
  useEffect(() => {
    const checkAuthUserStatus = async () => {
      try {
        // Call edge function to check if Auth user exists
        const { data } = await supabase.functions.invoke('check-user-existence', {
          body: { email: accountRequest.email }
        });

        const exists = data?.userExists || false;
        setAuthUserExists(exists);

        // First-time activation IF:
        // 1. password_hash is NULL OR incompatible format
        // 2. NO Auth user exists
        const hasIncompatibleHash = 
          !accountRequest.password_hash || 
          !accountRequest.password_hash.match(/^[0-9a-f]{64}$/);
        
        setIsFirstTimeActivation(hasIncompatibleHash && !exists);
        
        console.log('🔍 Activation status:', {
          hasPasswordHash: !!accountRequest.password_hash,
          isCompatibleFormat: accountRequest.password_hash?.match(/^[0-9a-f]{64}$/),
          authUserExists: exists,
          isFirstTimeActivation: hasIncompatibleHash && !exists
        });

      } catch (error) {
        console.error('Failed to check Auth user:', error);
        // Assume first-time activation if check fails
        setIsFirstTimeActivation(!accountRequest.password_hash);
      } finally {
        setCheckingAuthUser(false);
      }
    };

    checkAuthUserStatus();
  }, [accountRequest]);

  // ============================================
  // ✅ NEW: First-Time Activation Handler
  // ============================================
  const handleFirstTimeActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive"
      });
      setIsAuthenticating(false);
      return;
    }

    // Validate password strength
    if (password.length < 12) {
      toast({
        title: "Password too short",
        description: "Password must be at least 12 characters.",
        variant: "destructive"
      });
      setIsAuthenticating(false);
      return;
    }

    try {
      console.log('🆕 Starting first-time activation for:', accountRequest.email);

      // Call unified-account-approval with new password
      const { data, error } = await supabase.functions.invoke('unified-account-approval', {
        body: {
          requestId: accountRequest.id,
          status: 'approved',
          activationPassword: password, // New password for Auth user creation
          isFirstTimeActivation: true
        }
      });

      if (error) {
        console.error('❌ Activation failed:', error);
        toast({
          title: "Activation Failed",
          description: error.message || "Failed to activate account. Please contact support.",
          variant: "destructive"
        });
        setIsAuthenticating(false);
        return;
      }

      if (!data?.success) {
        console.error('❌ Activation unsuccessful:', data?.error);
        toast({
          title: "Activation Failed",
          description: data?.error || "Failed to activate account.",
          variant: "destructive"
        });
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
        toast({
          title: "Account Activated",
          description: "Your account is ready! Please sign in on the login page.",
          variant: "default"
        });
        setTimeout(() => navigate('/signin'), 2000);
        return;
      }

      console.log('✅ Auto-login successful');
      toast({
        title: "Welcome!",
        description: "Your account has been activated successfully.",
        variant: "default"
      });

      setTimeout(() => navigate('/dashboard/home'), 1500);

    } catch (error: any) {
      console.error('💥 Unexpected error:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
      setIsAuthenticating(false);
    }
  };

  // ============================================
  // ✅ EXISTING: Normal Password Activation Handler
  // ============================================
  const handlePasswordActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    // Detect incompatible hash format
    if (accountRequest.password_hash && 
        !accountRequest.password_hash.match(/^[0-9a-f]{64}$/)) {
      toast({
        title: "Incompatible Account",
        description: "Your account was created with an old system. Please contact support.",
        variant: "destructive",
        duration: 8000
      });
      setIsAuthenticating(false);
      return;
    }

    try {
      console.log('🔐 Starting password activation for:', accountRequest.email);

      // Call unified-account-approval with signup password
      const { data, error } = await supabase.functions.invoke('unified-account-approval', {
        body: {
          requestId: accountRequest.id,
          status: 'approved',
          activationPassword: password
        }
      });

      if (error) {
        console.error('❌ Activation failed:', error);
        toast({
          title: "Activation Failed",
          description: error.message,
          variant: "destructive"
        });
        setIsAuthenticating(false);
        return;
      }

      if (!data?.success) {
        if (data?.error?.includes('Invalid password')) {
          toast({
            title: "Incorrect Password",
            description: "Please use the password you created during signup.",
            variant: "destructive"
          });
        } else if (data?.alreadyExists) {
          toast({
            title: "Already Activated",
            description: "Your account is already active. Redirecting to login...",
            variant: "default"
          });
          setTimeout(() => navigate('/signin'), 2000);
          return;
        } else {
          toast({
            title: "Activation Failed",
            description: data?.error || "Failed to activate account.",
            variant: "destructive"
          });
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
        toast({
          title: "Account Activated",
          description: "Please sign in on the login page.",
          variant: "default"
        });
        setTimeout(() => navigate('/signin'), 2000);
        return;
      }

      toast({
        title: "Welcome!",
        description: "Your account is now active.",
        variant: "default"
      });
      setTimeout(() => navigate('/dashboard/home'), 1500);

    } catch (error: any) {
      console.error('💥 Unexpected error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setIsAuthenticating(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (checkingAuthUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Checking account status...</span>
      </div>
    );
  }

  // ============================================
  // ✅ NEW: First-Time Activation UI
  // ============================================
  if (isFirstTimeActivation) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Account Approved!
          </h2>
          <p className="text-gray-600">
            Welcome, <span className="font-semibold">{accountRequest.full_name}</span>!
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Set your password to activate your account
          </p>
        </div>

        <form onSubmit={handleFirstTimeActivation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Create Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={12}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isAuthenticating}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Minimum 12 characters, include uppercase, lowercase, number, and special character
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isAuthenticating}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isAuthenticating || !password || !confirmPassword}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Activating Account...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Set Password & Activate
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  // ============================================
  // ✅ EXISTING: Normal Password Activation UI
  // ============================================
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Account Approved!
        </h2>
        <p className="text-gray-600">
          Welcome, <span className="font-semibold">{accountRequest.full_name}</span>!
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Enter your signup password to activate
        </p>
      </div>

      <form onSubmit={handlePasswordActivation} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Signup Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isAuthenticating}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Use the password you created during signup
          </p>
        </div>

        <button
          type="submit"
          disabled={isAuthenticating || !password}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Activating Account...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Activate Account & Login
            </>
          )}
        </button>
      </form>
    </div>
  );
};
