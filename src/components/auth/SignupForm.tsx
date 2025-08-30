
import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Mail, Lock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SignupFormData } from "@/hooks/useSignupForm";
import { HoneypotField } from "@/components/security/HoneypotField";

interface SignupFormProps {
  form: UseFormReturn<SignupFormData>;
  onSubmit: (data: SignupFormData) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  form,
  onSubmit,
  isLoading,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleFormSubmit = async (data: SignupFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Signup error:", error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-4"
      >
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
                    disabled={isLoading}
                  />
                </div>
              </FormControl>
              <FormMessage />
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
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm Password Field */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-white">Confirm Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <CheckCircle className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    {...field}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
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
          disabled={isLoading}
          className="w-full bg-accent-green text-white font-semibold py-3 h-12 rounded-sm bg-lime-300 hover:bg-lime-200 text-base"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-sm text-slate-50">
            Already have an account?{" "}
            <Link
              to="/signin"
              className="text-lime-400 hover:text-lime-300 transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </form>
    </Form>
  );
};
