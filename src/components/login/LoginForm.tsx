
import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { LoginFormData } from '@/lib/validations/loginSchema';
import { HoneypotField } from '@/components/security/HoneypotField';
import { useEmailValidation } from '@/hooks/useEmailValidation';
import { useDebounce } from '@/hooks/useDebounce';

interface LoginFormProps {
  form: UseFormReturn<LoginFormData>;
  onSubmit: (data: LoginFormData) => Promise<void>;
  isSubmitting: boolean;
  canSubmit: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  form,
  onSubmit,
  isSubmitting,
  canSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const { validationResult, validateEmail } = useEmailValidation();
  
  const email = form.watch('email');
  const debouncedEmail = useDebounce(email, 800);

  // Validate email when debounced email changes
  useEffect(() => {
    if (debouncedEmail && debouncedEmail.includes('@')) {
      validateEmail(debouncedEmail);
    }
  }, [debouncedEmail, validateEmail]);

  // Check if login should be blocked based on email validation
  const isLoginBlocked = validationResult.status === 'not_found' || 
                        validationResult.status === 'pending' || 
                        validationResult.status === 'rejected';

  const getEmailValidationIcon = () => {
    switch (validationResult.status) {
      case 'loading':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />;
      case 'authenticated':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'not_found':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getValidationMessage = () => {
    if (!validationResult.message) return null;

    const getMessageColor = () => {
      switch (validationResult.status) {
        case 'authenticated':
        case 'approved':
          return 'text-green-600';
        case 'pending':
          return 'text-yellow-600';
        case 'rejected':
        case 'not_found':
          return 'text-red-600';
        default:
          return 'text-gray-600';
      }
    };

    const getActionLink = () => {
      switch (validationResult.status) {
        case 'not_found':
          return (
            <Link to="/account-request" className="text-blue-600 hover:text-blue-800 underline ml-1">
              Submit account request
            </Link>
          );
        case 'pending':
        case 'rejected':
          return (
            <Link to="/account-request-status" className="text-blue-600 hover:text-blue-800 underline ml-1">
              Check request status
            </Link>
          );
        default:
          return null;
      }
    };

    return (
      <div className={`flex items-center gap-2 text-sm mt-1 ${getMessageColor()}`}>
        {getEmailValidationIcon()}
        <span>{validationResult.message}</span>
        {getActionLink()}
      </div>
    );
  };

  const handleFormSubmit = async (data: LoginFormData) => {
    // Block login if email validation shows issues
    if (isLoginBlocked) {
      return;
    }
    
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Honeypot Field */}
        <HoneypotField form={form as any} />

        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-white">Email Address</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    {...field}
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                    disabled={isSubmitting}
                  />
                </div>
              </FormControl>
              <FormMessage />
              {getValidationMessage()}
            </FormItem>
          )}
        />

        {/* Password Field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-white">Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
          disabled={isSubmitting || !canSubmit || isLoginBlocked}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        {!canSubmit && (
          <p className="text-sm text-red-400 text-center">
            Too many login attempts. Please wait before trying again.
          </p>
        )}

        {isLoginBlocked && (
          <p className="text-sm text-yellow-400 text-center">
            Please resolve the email issue above before signing in.
          </p>
        )}
      </form>
    </Form>
  );
};
