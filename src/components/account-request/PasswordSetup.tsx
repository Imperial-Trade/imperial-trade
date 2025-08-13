import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordStrengthMeter } from "@/components/security/PasswordStrengthMeter";
import { ValidationFeedback } from "@/components/security/ValidationFeedback";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { ProfessionalButton } from "@/components/ui/professional-button";
import { Lock, Eye, EyeOff } from "lucide-react";
import {
  passwordSetupSchema,
  type PasswordSetupFormData,
} from "@/lib/validations/accountRequestSchema";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmail } from "@/components/auth/AuthNotifications";
import { cleanupAuthState } from "@/utils/authUtils";
import { useProfessionalToast } from "@/hooks/useProfessionalToast";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { LEGAL_VERSION } from "@/lib/constants/legal";

interface PasswordSetupProps {
  accountRequest: any;
  onSuccess: () => void;
}

interface Step {
  id: string;
  label: string;
  description: string;
  status: "pending" | "current" | "completed" | "error";
}

export const PasswordSetup: React.FC<PasswordSetupProps> = ({
  accountRequest,
  onSuccess,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const { success, error, celebrate } = useProfessionalToast();
  const navigate = useNavigate();

  const initialSteps: Step[] = [
    {
      id: "validation",
      label: "Password Validation",
      description: "Checking password requirements",
      status: "pending",
    },
    {
      id: "account-creation",
      label: "Account Creation",
      description: "Creating your user account",
      status: "pending",
    },
    {
      id: "profile-setup",
      label: "Profile Setup",
      description: "Setting up your profile",
      status: "pending",
    },
    {
      id: "authentication",
      label: "Authentication",
      description: "Logging you in securely",
      status: "pending",
    },
  ];

  const [stepStatuses, setStepStatuses] = useState<Step[]>(initialSteps);

  const updateStepStatus = (
    stepIndex: number,
    status: "pending" | "current" | "completed" | "error"
  ) => {
    setStepStatuses((prev) =>
      prev.map((step, index) =>
        index === stepIndex ? { ...step, status } : step
      )
    );
    setCurrentStep(stepIndex);
  };

  const form = useForm<PasswordSetupFormData>({
    resolver: zodResolver(passwordSetupSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      accept_legal: false,
    },
    mode: "onChange",
  });

  const password = form.watch("password");
  const confirmPassword = form.watch("confirmPassword");

  const passwordsMatch =
    password && confirmPassword && password === confirmPassword;
  const showPasswordMismatch =
    confirmPassword &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  const handlePasswordSetup = async (data: PasswordSetupFormData) => {
    setIsSubmitting(true);

    try {
      // Step 1: Password Validation
      updateStepStatus(0, "current");
      setProcessingStatus("Validating password requirements...");
      await new Promise((resolve) => setTimeout(resolve, 800));
      updateStepStatus(0, "completed");

      // Step 2: Account Creation
      updateStepStatus(1, "current");
      setProcessingStatus("Creating your secure account...");

      cleanupAuthState();

      try {
        await supabase.auth.signOut({ scope: "global" });
      } catch (err) {
        logger.log("No existing session to sign out");
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountRequest.email,
        password: data.password,
        options: {
          data: {
            full_name: accountRequest.full_name,
            account_type: accountRequest.account_type,
            role:
              accountRequest.account_type === "educator" ? "educator" : "user",
            access_level:
              accountRequest.account_type === "educator" ? "moderator" : "user",
            user_type:
              accountRequest.account_type === "educator"
                ? "educator"
                : "member",
            account_status: "active",
            registration_source: "account_request",
            phone_number: accountRequest.phone_number,
            username: accountRequest.username,
            vt_market_account_number: accountRequest.vt_market_account_number,
            website: accountRequest.website,
            referrer: accountRequest.referrer,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      updateStepStatus(1, "completed");

      // Step 3: Profile Setup
      updateStepStatus(2, "current");
      setProcessingStatus("Setting up your profile...");

      try {
        const { error: updateError } = await supabase
          .from("account_requests")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("id", accountRequest.id);

        if (updateError) {
          logger.warn(
            "Could not update account request timestamp:",
            updateError
          );
        }
      } catch (updateErr) {
        logger.warn("Error updating request timestamp:", updateErr);
      }

      // Persist legal acceptance to profiles (single checkbox)
      try {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({
            legal_accepted: true,
            legal_accepted_at: new Date().toISOString(),
            legal_version: LEGAL_VERSION,
          })
          .eq("id", authData.user.id);

        if (profileErr) {
          logger.warn(
            "Could not update legal acceptance on profile:",
            profileErr
          );
        }
      } catch (profErr) {
        logger.warn("Error updating profile legal acceptance:", profErr);
      }

      updateStepStatus(2, "completed");

      // Step 4: Authentication
      updateStepStatus(3, "current");
      setProcessingStatus("Completing authentication...");

      try {
        await sendWelcomeEmail(accountRequest.email, accountRequest.full_name);
      } catch (emailError) {
        logger.warn("Welcome email failed:", emailError);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      updateStepStatus(3, "completed");

      celebrate(
        "Welcome to Imperial Trading! 🎉",
        "Your account has been created successfully. Redirecting to dashboard..."
      );

      onSuccess();

      setTimeout(() => {
        navigate("/dashboard/home", { replace: true });
      }, 2000);
    } catch (error: any) {
      logger.error("Password setup error:", error);

      // Mark current step as error
      setStepStatuses((prev) =>
        prev.map((step, index) =>
          index === currentStep ? { ...step, status: "error" } : step
        )
      );

      if (error.message?.includes("Password")) {
        error(
          "Password Error",
          error.message || "Password does not meet security requirements."
        );
      } else {
        error(
          "Account Creation Failed",
          error.message ||
            "There was an error creating your account. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary text-center flex items-center justify-center gap-2">
            <Lock className="w-6 h-6" />
            Set Up Your Password
          </CardTitle>
          <p className="text-secondary text-center text-white">
            Create a secure password to complete your account setup and access
            your dashboard
          </p>
        </CardHeader>
        <CardContent>
          {isSubmitting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6"
            >
              <ProgressSteps
                steps={stepStatuses}
                currentStep={currentStep}
                className="mb-4"
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <p className="text-primary font-medium">{processingStatus}</p>
                <div className="mt-2 text-sm text-muted-foreground">
                  Please wait while we set up your account...
                </div>
              </motion.div>
            </motion.div>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handlePasswordSetup)}
              className="space-y-6"
            >
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
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          disabled={isSubmitting}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </motion.button>
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
                    <FormLabel className="text-white">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          className={`pr-10 bg-white text-gray-900 ${
                            showPasswordMismatch
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : passwordsMatch
                              ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                              : "border-gray-300"
                          }`}
                          disabled={isSubmitting}
                        />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          disabled={isSubmitting}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </motion.button>
                      </div>
                    </FormControl>

                    {showPasswordMismatch && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm text-red-500 mt-1"
                      >
                        <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                          ×
                        </span>
                        <span>Passwords don't match</span>
                      </motion.div>
                    )}

                    {passwordsMatch && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm text-green-500 mt-1"
                      >
                        <span className="w-4 h-4 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
                          ✓
                        </span>
                        <span>Passwords match</span>
                      </motion.div>
                    )}
                  </FormItem>
                )}
              />

              {/* Legal Acceptance */}
              <FormField
                control={form.control}
                name="accept_legal"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Accept Terms of Use and Privacy Policy"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-gray-200 leading-6 cursor-pointer">
                        I have read and agree to the{" "}
                        <a
                          href="/legal/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-teal-300 hover:text-teal-200"
                        >
                          Terms of Use
                        </a>{" "}
                        and{" "}
                        <a
                          href="/legal/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-teal-300 hover:text-teal-200"
                        >
                          Privacy Policy
                        </a>
                        .
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <ProfessionalButton
                type="submit"
                isLoading={isSubmitting}
                disabled={!form.formState.isValid || showPasswordMismatch}
                loadingText="Creating Account..."
                className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
              >
                Create Account & Access Dashboard
              </ProfessionalButton>
            </form>
          </Form>

          <div className="text-xs text-gray-400 text-center mt-4">
            After creation, you'll be automatically logged in and redirected to
            your dashboard.
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
