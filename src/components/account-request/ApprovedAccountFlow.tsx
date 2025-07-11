
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { sendWelcomeEmail } from '@/components/auth/WelcomeEmailService';
import { cleanupAuthState } from '@/utils/authUtils';

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
      // Clean up any existing auth state first
      cleanupAuthState();
      
      // Attempt to sign out any existing session
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('No existing session to sign out');
      }

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
        // Update the account request with approved timestamp
        const { error: updateError } = await supabase
          .from('account_requests')
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq('id', accountRequest.id);

        if (updateError) {
          console.error('Error updating account request:', updateError);
        }

        // Send welcome email
        try {
          await sendWelcomeEmail(accountRequest.email, accountRequest.full_name);
        } catch (emailError) {
          console.warn('Welcome email failed:', emailError);
          // Don't fail the whole process for email issues
        }

        // Sign in the user automatically
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: accountRequest.email,
          password: password,
        });

        if (signInError) {
          console.error('Auto sign-in error:', signInError);
          toast({
            title: "Account Created Successfully!",
            description: "Please sign in with your new credentials.",
          });
          navigate('/signin', { 
            state: { 
              message: 'Account created successfully! Please sign in with your credentials.',
              email: accountRequest.email
            }
          });
          return;
        }

        toast({
          title: "Welcome to Imperial Trading!",
          description: "Your account has been created successfully. Redirecting to dashboard...",
        });

        // Redirect to dashboard after successful creation and login
        setTimeout(() => {
          navigate('/dashboard/home');
        }, 2000);
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
          Congratulations! Your account request has been approved. Please create your password to complete registration and gain exclusive access.
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
              disabled={isCreating}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={isCreating}
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
            disabled={isCreating}
          />
        </div>

        <Button
          type="submit"
          disabled={isCreating || !password || !confirmPassword}
          className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
        >
          {isCreating ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating Account...
            </div>
          ) : (
            <>
              Complete Registration & Access Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      <div className="text-xs text-gray-400 text-center">
        Password must be at least 8 characters long. After creation, you'll receive a welcome email and be automatically logged into your dashboard.
      </div>
    </div>
  );
};
