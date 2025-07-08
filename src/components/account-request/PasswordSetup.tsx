
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { PasswordStrengthMeter } from '@/components/security/PasswordStrengthMeter';
import { ValidationFeedback } from '@/components/security/ValidationFeedback';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { passwordSetupSchema, type PasswordSetupFormData } from '@/lib/validations/accountRequestSchema';
import { supabase } from '@/integrations/supabase/client';
import { sendWelcomeEmail } from '@/components/auth/AuthNotifications';
import { useToast } from '@/hooks/use-toast';

interface PasswordSetupProps {
  accountRequest: any;
  onSuccess: () => void;
}

export const PasswordSetup: React.FC<PasswordSetupProps> = ({ accountRequest, onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<PasswordSetupFormData>({
    resolver: zodResolver(passwordSetupSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = form.watch('password');

  const handlePasswordSetup = async (data: PasswordSetupFormData) => {
    setIsSubmitting(true);
    
    try {
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountRequest.email,
        password: data.password,
        options: {
          data: {
            full_name: accountRequest.full_name,
            account_type: accountRequest.account_type,
          },
          emailRedirectTo: `${window.location.origin}/dashboard/home`
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Send welcome email
      await sendWelcomeEmail(accountRequest.email, accountRequest.full_name);

      toast({
        title: "Account Created Successfully!",
        description: "Welcome to Imperial Trading. You are now logged in.",
      });

      // Auto-login and redirect
      setTimeout(() => {
        window.location.href = '/dashboard/home';
      }, 2000);

    } catch (error: any) {
      console.error('Password setup error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('already registered')) {
        toast({
          variant: "destructive",
          title: "Account Already Exists",
          description: "An account with this email already exists. Please try logging in instead.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Account Creation Failed",
          description: error.message || "There was an error creating your account. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-effect border-default">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary text-center flex items-center justify-center gap-2">
          <Lock className="w-6 h-6" />
          Set Up Your Password
        </CardTitle>
        <p className="text-secondary text-center text-white">
          Create a secure password to complete your account setup
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handlePasswordSetup)} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-white">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pr-10 bg-white border-gray-300 text-gray-900"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <ValidationFeedback
                    error={fieldState.error}
                    isValid={!fieldState.error && field.value.length > 0}
                    value={field.value}
                  />
                  <PasswordStrengthMeter password={field.value} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-white">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="pr-10 bg-white border-gray-300 text-gray-900"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <ValidationFeedback
                    error={fieldState.error}
                    isValid={!fieldState.error && field.value.length > 0}
                    value={field.value}
                  />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
              className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Creating Account...
                </div>
              ) : (
                "Create Account & Login"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
