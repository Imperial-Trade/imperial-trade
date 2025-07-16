
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserExistenceCheck } from '@/hooks/useUserExistenceCheck';
import { PasswordSetup } from './PasswordSetup';

interface UserExistenceCheckProps {
  accountRequest: any;
}

export const UserExistenceCheck: React.FC<UserExistenceCheckProps> = ({ accountRequest }) => {
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const { checkUserExists, isChecking, error, clearError } = useUserExistenceCheck();

  useEffect(() => {
    const checkUser = async () => {
      if (accountRequest?.email) {
        const exists = await checkUserExists(accountRequest.email);
        setUserExists(exists);
      }
    };

    checkUser();
  }, [accountRequest?.email, checkUserExists]);

  const handleRetryCheck = async () => {
    clearError();
    if (accountRequest?.email) {
      const exists = await checkUserExists(accountRequest.email);
      setUserExists(exists);
    }
  };

  const handlePasswordSetupSuccess = () => {
    // Success handling is managed within PasswordSetup component
    console.log('Password setup completed successfully');
  };

  // Loading state while checking user existence
  if (isChecking || userExists === null) {
    return (
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-green border-t-transparent mx-auto" />
        <p className="text-gray-300">Checking account status...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="glass-effect border-red-500/20 bg-red-500/5">
        <CardContent className="p-6 text-center space-y-4">
          <div className="text-red-400">
            <p className="font-medium">Unable to verify account status</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <Button
            onClick={handleRetryCheck}
            className="bg-accent-green hover:bg-green-500 text-white"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // User already exists - show login option
  if (userExists) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <LogIn className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Account Already Exists
          </h3>
          <p className="text-gray-300 mb-6">
            An account with the email <span className="font-medium text-white">{accountRequest.email}</span> already exists. 
            Please sign in to access your account.
          </p>
        </div>

        <div className="bg-surface/20 rounded-lg p-4 space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Name:</span>
            <span className="text-white">{accountRequest.full_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Email:</span>
            <span className="text-white">{accountRequest.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Account Type:</span>
            <span className="text-white">
              {accountRequest.account_type === 'educator' 
                ? 'Educator / IB Partner' 
                : 'Standard Member'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Link to="/signin">
            <Button className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Your Account
            </Button>
          </Link>
          
          <p className="text-xs text-gray-400 text-center">
            If you're having trouble signing in, please contact support for assistance.
          </p>
        </div>
      </div>
    );
  }

  // User doesn't exist - show password setup
  return (
    <div className="space-y-6">
      <div className="text-center">
        <UserPlus className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Complete Your Registration
        </h3>
        <p className="text-gray-300 mb-6">
          Your account request has been approved! Create your password to complete registration and gain access.
        </p>
      </div>

      <div className="bg-surface/20 rounded-lg p-4 space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Name:</span>
          <span className="text-white">{accountRequest.full_name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Email:</span>
          <span className="text-white">{accountRequest.email}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Account Type:</span>
          <span className="text-white">
            {accountRequest.account_type === 'educator' 
              ? 'Educator / IB Partner' 
              : 'Standard Member'}
          </span>
        </div>
        {accountRequest.approved_at && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Approved:</span>
            <span className="text-white">
              {new Date(accountRequest.approved_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <PasswordSetup 
        accountRequest={accountRequest} 
        onSuccess={handlePasswordSetupSuccess}
      />
    </div>
  );
};
