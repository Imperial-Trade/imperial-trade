import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { simplifiedSignupSchema, type SimplifiedSignupFormData } from "@/lib/validations/simplifiedSignupSchema";
import { Link } from "react-router-dom";

interface SimplifiedSignupFormProps {
  onSubmit: (data: SimplifiedSignupFormData) => Promise<void>;
  onFacebookSignup: () => Promise<void>;
  isSubmitting: boolean;
  canSubmit: boolean;
}

export const SimplifiedSignupForm: React.FC<SimplifiedSignupFormProps> = ({
  onSubmit,
  onFacebookSignup,
  isSubmitting,
  canSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SimplifiedSignupFormData>({
    resolver: zodResolver(simplifiedSignupSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      terms_accepted: false,
      website: "",
    },
    mode: "onChange",
  });

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Honeypot field */}
          <div style={{ display: 'none' }} aria-hidden="true">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      autoComplete="off"
                      tabIndex={-1}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Full Name */}
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Your Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter your full name"
                    className="h-12 bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="Enter your email"
                    className="h-12 bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="h-12 bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500 pr-10"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Terms Checkbox */}
          <FormField
            control={form.control}
            name="terms_accepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm text-gray-600 font-normal">
                    By signing up you agree to the{" "}
                    <Link to="/terms" className="text-purple-600 hover:underline font-medium">
                      terms of service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-purple-600 hover:underline font-medium">
                      privacy policy
                    </Link>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Sign Up Button */}
          <Button
            type="submit"
            className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-all duration-200"
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating account...
              </span>
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>
      </Form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or</span>
        </div>
      </div>

      {/* Facebook Sign Up Button */}
      <Button
        type="button"
        onClick={onFacebookSignup}
        variant="outline"
        className="w-full h-12 border-2 border-gray-300 hover:bg-gray-50 text-gray-900 font-medium rounded-lg transition-all duration-200"
        disabled={isSubmitting}
      >
        <Facebook className="w-5 h-5 mr-2 text-blue-600" />
        Sign up with Facebook
      </Button>

      {/* Already have account link */}
      <div className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/signin" className="text-gray-900 font-bold hover:underline">
          Log in
        </Link>
      </div>
    </div>
  );
};
