import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: 'https://www.tradeimperial.com/reset-password',
      });

      if (error) {
        console.error('[ForgotPassword] resetPasswordForEmail error', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
        return;
      }

      console.info('[ForgotPassword] Reset email sent successfully', { email: data.email });

      setEmailSent(true);
      toast({
        title: "Email Sent",
        description: "If an account with that email exists, we've sent you a password reset link.",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        variant: "destructive", 
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-lime-200">
            Check Your Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-lime-500/20 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-lime-400" />
            </div>
            <p className="text-slate-50">
              We've sent a password reset link to your email address.
            </p>
            <p className="text-sm text-slate-300">
              Please check your inbox and follow the instructions to reset your password.
            </p>
            <p className="text-xs text-slate-400">If you don’t see the email within a few minutes:</p>
            <ul className="text-xs text-slate-400 text-left mx-auto max-w-xs list-disc pl-5 space-y-1">
              <li>Check your Spam or Junk folder</li>
              <li>Add no-reply@tradeimperial.com to your contacts</li>
              <li>Verify the email you entered is correct</li>
            </ul>
            <p className="text-xs text-slate-400">
              Still no email? Contact support at <a href="mailto:tradeimperial2025@gmail.com" className="underline">tradeimperial2025@gmail.com</a>.
            </p>
          </div>
          
          <Button
            onClick={onBack}
            variant="outline"
            className="w-full border-white/20 text-white bg-black/20 hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect border-default">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-lime-200">
          Reset Password
        </CardTitle>
        <p className="text-center text-slate-50">
          Enter your email address and we'll send you a reset link
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
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
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-lime-300 hover:bg-lime-200 text-black font-semibold py-3 h-12"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent mr-2" />
                    Sending Reset Link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <Button
                type="button"
                onClick={onBack}
                variant="outline"
                className="w-full border-white/20 text-white bg-black/20 hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </div>

            <div className="text-xs text-slate-400 text-center mt-2 space-y-1">
              <p>Didn’t receive the email? Check your Spam folder or wait a couple of minutes.</p>
              <p>
                For help, contact
                {' '}<a href="mailto:tradeimperial2025@gmail.com" className="underline">tradeimperial2025@gmail.com</a>.
              </p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};