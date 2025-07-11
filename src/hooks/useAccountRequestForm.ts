
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountRequestSchema, type AccountRequestFormData } from "@/lib/validations/accountRequestSchema";
import { useProgressiveRateLimiting } from "./useProgressiveRateLimiting";
import { serverRateLimitService } from "@/services/ServerRateLimitService";
import { useToast } from "@/hooks/use-toast";
import { AccountRequest } from "@/api/entities";

// Error message mapping for user-friendly error display
const getErrorMessage = (error: any): string => {
  console.log("Full error object:", error);
  
  // Check for rate limiting errors
  if (error?.message?.includes('rate limit') || error?.message?.includes('too many')) {
    return "Too many requests. Please wait before submitting another request.";
  }
  
  // Check for specific database constraint errors
  if (error?.message?.includes('violates check constraint')) {
    return "Please check that all form fields are filled correctly. The account type or other fields may contain invalid values.";
  }
  
  if (error?.message?.includes('account_type')) {
    return "Invalid account type selected. Please choose either Standard Member or Educator/IB Partner.";
  }
  
  if (error?.message?.includes('email')) {
    return "Please enter a valid email address.";
  }
  
  if (error?.message?.includes('phone_number')) {
    return "Please enter a valid phone number.";
  }
  
  if (error?.message?.includes('duplicate key')) {
    return "An account request with this email already exists. Please use a different email address.";
  }
  
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return "Network error. Please check your internet connection and try again.";
  }
  
  if (error?.code === 'PGRST301') {
    return "Database error: Please verify all required fields are filled correctly.";
  }
  
  // Default error message
  return "Failed to submit your request. Please check all fields and try again. If the problem persists, please contact support.";
};

export const useAccountRequestForm = () => {
  const { toast } = useToast();
  const progressiveRateLimit = useProgressiveRateLimiting('account-request', {
    maxAttempts: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
    progressiveDelays: [0, 30000, 120000, 300000, 600000], // 0s, 30s, 2m, 5m, 10m
    recoveryRate: 2 * 60 * 1000, // Recover 1 attempt every 2 minutes
  });

  const form = useForm<AccountRequestFormData>({
    resolver: zodResolver(accountRequestSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      vt_market_account_number: "",
      referrer: "",
      account_type: "user",
      reason: "",
      website: "", // Honeypot field
    },
    mode: "onChange", // Real-time validation
  });

  const onSubmit = async (data: AccountRequestFormData): Promise<{ success: boolean; error?: string }> => {
    // Check client-side progressive rate limiting
    if (!progressiveRateLimit.canSubmit) {
      const delay = progressiveRateLimit.nextAttemptDelay;
      const message = progressiveRateLimit.getDelayMessage(delay);
      toast({
        variant: "destructive",
        title: "Rate Limited",
        description: message || "Too many attempts. Please wait before submitting another request.",
      });
      return { success: false, error: message };
    }

    // Check honeypot - silent fail for bots
    if (data.website && data.website.length > 0) {
      console.log("Bot detected via honeypot");
      return { success: false, error: "Invalid submission detected" };
    }

    // Enhanced client-side validation for account_type
    if (!['user', 'educator'].includes(data.account_type)) {
      const errorMsg = "Please select a valid account type: Standard Member or Educator/IB Partner.";
      toast({
        variant: "destructive",
        title: "Invalid Account Type",
        description: errorMsg,
      });
      return { success: false, error: errorMsg };
    }

    try {
      // Server-side rate limiting checks
      console.log('Performing server-side rate limit checks...');
      
      // Check email rate limit (1 per day per email)
      const emailCheck = await serverRateLimitService.checkEmailRateLimit(data.email);
      if (!emailCheck.allowed) {
        const errorMsg = `This email has already been used for an account request today. Please try again after ${new Date(emailCheck.resetTime).toLocaleString()}.`;
        toast({
          variant: "destructive",
          title: "Email Rate Limited",
          description: errorMsg,
        });
        return { success: false, error: errorMsg };
      }

      // Check IP rate limit (10 per hour per IP)
      const clientIP = serverRateLimitService.getClientIP();
      const ipCheck = await serverRateLimitService.checkIPRateLimit(clientIP);
      if (!ipCheck.allowed) {
        const errorMsg = `Too many requests from your network. Please try again after ${new Date(ipCheck.resetTime).toLocaleString()}.`;
        toast({
          variant: "destructive",
          title: "Network Rate Limited",
          description: errorMsg,
        });
        return { success: false, error: errorMsg };
      }

      // Record client-side attempt (with progressive delay)
      await progressiveRateLimit.recordAttempt();
      
      console.log("Submitting account request with data:", {
        ...data,
        account_type: data.account_type // Explicitly log the account type being sent
      });
      
      // Use direct Supabase call instead of REST API
      const result = await AccountRequest.create(data);
      
      console.log("Account request created successfully:", result);

      toast({
        title: "Success!",
        description: `Your ${data.account_type === 'educator' ? 'Educator/IB Partner' : 'Standard Member'} request has been submitted successfully. You will receive an email notification once it's reviewed.`,
      });

      form.reset();
      return { success: true };
    } catch (error) {
      console.error("Failed to submit account request:", error);
      
      const userFriendlyError = getErrorMessage(error);
      
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: userFriendlyError,
      });
      
      return { success: false, error: userFriendlyError };
    }
  };

  return {
    form,
    onSubmit,
    canSubmit: progressiveRateLimit.canSubmit,
    isSubmitting: form.formState.isSubmitting,
    attemptsLeft: progressiveRateLimit.attemptsLeft,
    nextAttemptDelay: progressiveRateLimit.nextAttemptDelay,
    getDelayMessage: progressiveRateLimit.getDelayMessage,
    maxAttempts: progressiveRateLimit.maxAttempts,
  };
};
