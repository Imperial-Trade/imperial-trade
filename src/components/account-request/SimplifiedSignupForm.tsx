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
      phone_number: "",
      password: "",
      terms_accepted: false,
      website: "",
    },
    mode: "onChange",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
              <FormLabel className="text-sm font-medium text-zinc-400">Your Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  autoComplete="name"
                  className="w-full mt-1 bg-transparent border-0 border-b border-zinc-600 rounded-none px-1 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200"
                  disabled={isSubmitting}
                />
              </FormControl>
              {form.formState.errors.full_name && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.full_name.message}</p>
              )}
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-zinc-400">Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  autoComplete="email"
                  className="w-full mt-1 bg-transparent border-0 border-b border-zinc-600 rounded-none px-1 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200"
                  disabled={isSubmitting}
                />
              </FormControl>
              {form.formState.errors.email && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
              )}
            </FormItem>
          )}
        />

        {/* Phone Number */}
        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-zinc-400">Phone Number (Optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 (555) 000-0000"
                  className="w-full mt-1 bg-transparent border-0 border-b border-zinc-600 rounded-none px-1 py-3 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200"
                  disabled={isSubmitting}
                />
              </FormControl>
              {form.formState.errors.phone_number && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone_number.message}</p>
              )}
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-zinc-400">Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className={`w-full mt-1 bg-transparent border-0 border-b ${
                      form.formState.errors.password ? 'border-red-500' : 'border-zinc-600'
                    } rounded-none px-1 py-3 pr-10 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200`}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              {form.formState.errors.password && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
              )}
            </FormItem>
          )}
        />

        {/* Terms Checkbox */}
        <FormField
          control={form.control}
          name="terms_accepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-gray-600"
                />
              </FormControl>
              <div className="leading-none">
                <FormLabel className="text-xs text-gray-400 font-normal cursor-pointer">
                  By signing up you agree to the{" "}
                  <a href="#" className="font-semibold text-gray-200 hover:underline">
                    terms of service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="font-semibold text-gray-200 hover:underline">
                    privacy policy
                  </a>
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* Buttons */}
        <div className="pt-4 space-y-4">
          <Button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className="w-full p-3 rounded-xl font-semibold transition-all duration-300 ease-in-out hover:-translate-y-0.5"
            style={{
              background: '#f4f4f5',
              color: '#18181b',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e4e4e7';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f4f4f5';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            }}
          >
            {isSubmitting ? "Submitting..." : "Sign Up"}
          </Button>

          <Button
            type="button"
            onClick={onFacebookSignup}
            disabled={isSubmitting}
            className="w-full p-3 rounded-xl font-semibold transition-all duration-300 ease-in-out hover:-translate-y-0.5 border"
            style={{
              background: 'transparent',
              color: '#f4f4f5',
              borderColor: '#52525b',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = '#a1a1aa';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#52525b';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            }}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z"
                clipRule="evenodd"
              />
            </svg>
            Sign up with Facebook
          </Button>
        </div>

        {/* Login Link */}
        <div className="text-center text-gray-400 text-sm pt-4 space-y-2">
          <p>
            Already have an account?{" "}
            <Link to="/signin" className="font-semibold text-gray-200 hover:underline">
              Log in
            </Link>
          </p>
          <p className="text-xs">
            Want to check your request status?{" "}
            <Link to="/account-request-status" className="font-semibold text-gray-200 hover:underline">
              Check status
            </Link>
          </p>
        </div>
      </form>
    </Form>
  );
};
