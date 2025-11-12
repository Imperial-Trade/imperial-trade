import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, LogIn, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserExistenceCheck } from '@/hooks/useUserExistenceCheck';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserExistenceCheckProps {
  accountRequest: any;
}

export const UserExistenceCheck: React.FC<UserExistenceCheckProps> = ({ accountRequest }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkUserExists, isChecking, error: checkError, clearError } = useUserExistenceCheck({ accountRequest });
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    const performCheck = async () => {
      if (accountRequest?.email) {
        const exists = await checkUserExists(accountRequest.email);
        setUserExists(exists);
        
        // Auto-create account if approved but doesn't exist
        if (!exists && accountRequest.status === 'approved') {
          await handleAutoAccountCreation();
        }
      }
    };
    performCheck();
  }, [accountRequest?.email, checkUserExists]);

  const handleAutoAccountCreation = async () => {
    setIsCreatingAccount(true);
    try {
      // Call edge function to create account with stored credentials
      const { data, error } = await supabase.functions.invoke('create-approved-account', {
        body: { 
          email: accountRequest.email,
          accountRequestId: accountRequest.id 
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Account Created!",
          description: "Check your email for a password reset link to set your password and sign in.",
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              email: accountRequest.email,
              message: 'Your account has been created! Check your email for a password reset link.'
            }
          });
        }, 3000);
      }
    } catch (error: any) {
      console.error('Auto account creation error:', error);
      toast({
        title: "Account Setup Required",
        description: "Please check your email for a password reset link to activate your account.",
        variant: "default",
      });
      
      // Still redirect to login
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            email: accountRequest.email,
            message: 'Check your email for account setup instructions.'
          }
        });
      }, 3000);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleRetryCheck = async () => {
    clearError();
    if (accountRequest?.email) {
      const exists = await checkUserExists(accountRequest.email);
      setUserExists(exists);
    }
  };

  // Loading state (including account creation)
  if (isChecking || userExists === null || isCreatingAccount) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-2xl border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isCreatingAccount ? 'Setting Up Your Account' : 'Checking Account Status'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground text-center">
            {isCreatingAccount ? 'Activating your account and sending setup instructions...' : 'Checking account status...'}
          </p>
          {isCreatingAccount && (
            <p className="text-sm text-muted-foreground text-center">
              You'll receive an email shortly with instructions to set your password.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (checkError) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-2xl border-destructive/20">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Verification Error</CardTitle>
          <CardDescription>{checkError}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRetryCheck} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // User exists - show login
  if (userExists) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Account Ready!</CardTitle>
          <CardDescription>
            Your account is active and ready to use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <p className="text-sm"><span className="font-semibold">Name:</span> {accountRequest.full_name}</p>
            <p className="text-sm"><span className="font-semibold">Email:</span> {accountRequest.email}</p>
            <p className="text-sm"><span className="font-semibold">Account Type:</span> {accountRequest.account_type === 'educator' ? 'Educator / IB Partner' : 'Standard Member'}</p>
          </div>
          <Button 
            onClick={() => navigate('/login', { state: { email: accountRequest.email }})} 
            className="w-full"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In to Your Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  // User does not exist - this shouldn't happen as account is auto-created above
  // This is a fallback state
  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-primary/20">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-2">
          <AlertCircle className="h-8 w-8 text-yellow-500" />
        </div>
        <CardTitle className="text-2xl">Account Setup In Progress</CardTitle>
        <CardDescription>
          Check your email for account activation instructions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="text-sm"><span className="font-semibold">Email:</span> {accountRequest.email}</p>
          <p className="text-sm"><span className="font-semibold">Name:</span> {accountRequest.full_name}</p>
        </div>
        <Button onClick={() => navigate('/login', { state: { email: accountRequest.email }})} className="w-full">
          Go to Sign In
        </Button>
      </CardContent>
    </Card>
  );
};
