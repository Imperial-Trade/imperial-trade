import React, { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoginFormData } from "@/lib/validations/loginSchema";
import { HoneypotField } from "@/components/security/HoneypotField";

interface LoginFormProps {
  form: UseFormReturn<LoginFormData>;
  onSubmit: (data: LoginFormData) => Promise<void>;
  isSubmitting: boolean;
  canSubmit: boolean;
  onForgotPassword?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  form,
  onSubmit,
  isSubmitting,
  canSubmit,
  onForgotPassword,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleFormSubmit = async (data: LoginFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Login error:", error);
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
              <FormLabel className="text-white bg-transparent">
                Email Address
              </FormLabel>
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

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !canSubmit}
          className="w-full bg-accent-green text-white font-semibold py-3 h-12 rounded-sm bg-lime-300 hover:bg-lime-200 text-base"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </Button>

        {!canSubmit && (
          <p className="text-sm text-red-400 text-center">
            Too many login attempts. Please wait before trying again.
          </p>
        )}

        {onForgotPassword && (
          <div className="text-center">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-lime-400 hover:text-lime-300 transition-colors"
            >
              Forgot your password?
            </button>
          </div>
        )}
      </form>
    </Form>
  );
};
