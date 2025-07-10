import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ApprovedAccountFlowProps {
  accountRequest: any;
}

export const ApprovedAccountFlow: React.FC<ApprovedAccountFlowProps> = ({ 
  accountRequest 
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create the user account with enhanced metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountRequest.email,
        password: password,
        options: {
          data: {
            full_name: accountRequest.full_name,
            role: accountRequest.account_type === 'educator' ? 'educator' : 'user',
            access_level: accountRequest.account_type === 'educator' ? 'moderator' : 'user',
            user_type: accountRequest.account_type === 'educator' ? 'educator' : 'member',
            account_status: 'active',
            registration_source: 'account_request',
            phone_number: accountRequest.phone_number,
            username: accountRequest.username,
            vt_market_account_number: accountRequest.vt_market_account_number,
            website: accountRequest.website,
            referrer: accountRequest.referrer
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast({
          variant: "destructive",
          title: "Account Creation Failed",
          description: authError.message || "Failed to create account. Please try again.",
        });
        return;
      }

      if (authData.user) {
        // Update the account request status to approved (since it was already approved, we don't change it)
        // The account is now fully activated, but we keep the status as approved
        const { error: updateError } = await supabase
          .from('account_requests')
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq('id', accountRequest.id);

        if (updateError) {
          console.error('Error updating account request:', updateError);
        }

        toast({
          title: "Account Created Successfully!",
          description: "Your account has been created. You can now sign in.",
        });

        // Navigate to sign in page
        navigate('/signin', { 
          state: { 
            message: 'Account created successfully! Please sign in with your credentials.',
            email: accountRequest.email
          }
        });
      }
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        variant: "destructive",
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again later.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Account Request Approved!
        </h3>
        <p className="text-gray-300">
          Your account request has been approved. Please set up your password to complete the registration.
        </p>
      </div>

      <div className="bg-surface/20 rounded-lg p-4 space-y-2">
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

      <form onSubmit={handleCreateAccount} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Create Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="pr-10 bg-white border-gray-300 text-gray-900"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Confirm Password
          </label>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            className="bg-white border-gray-300 text-gray-900"
            required
            minLength={8}
          />
        </div>

        <Button
          type="submit"
          disabled={isCreating || !password || !confirmPassword}
          className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
        >
          {isCreating ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          ) : (
            <>
              Complete Registration
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <div className="text-xs text-gray-400 text-center">
        Password must be at least 8 characters long and contain a mix of letters, numbers, and symbols for security.
      </div>
    </div>
  );
};
