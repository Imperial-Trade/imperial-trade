
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountRequestSchema, type AccountRequestFormData } from "@/lib/validations/accountRequestSchema";
import { useToast } from "@/hooks/use-toast";
import { AccountRequest } from "@/api/entities";
import { useState } from "react";

// Error message mapping for user-friendly error display
const getErrorMessage = (error: any): string => {
  console.log("🔍 Full error object:", error);
  
  // Check for rate limiting errors
  if (error?.message?.includes('rate limit') || error?.message?.includes('too many')) {
    return "Too many requests. Please wait before submitting another request.";
  }
  
  // Check for specific database constraint errors
  if (error?.message?.includes('violates check constraint')) {
    return "Please check that all form fields are filled correctly. The account type or other fields may contain invalid values.";
  }
  
  if (error?.message?.includes('account_type')) {
    return "Invalid account type selected. Please choose either Standard Member or Educator.";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<number>(0);

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
    console.log('🚀 Account request submission started');
    console.log('📋 Form data:', data);
    
    setIsSubmitting(true);
    
    // Reduced rate limiting (1 submission per 2 minutes instead of 5)
    const now = Date.now();
    const minDelay = 2 * 60 * 1000; // 2 minutes
    
    if (lastSubmission && (now - lastSubmission) < minDelay) {
      const remainingMs = minDelay - (now - lastSubmission);
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      const errorMsg = `Please wait ${remainingMinutes} more minutes before submitting another request.`;
      
      toast({
        variant: "destructive",
        title: "Too Many Requests",
        description: errorMsg,
      });
      
      setIsSubmitting(false);
      return { success: false, error: errorMsg };
    }

    // Honeypot check
    if (data.website && data.website.length > 0) {
      console.log('🤖 Bot detected via honeypot');
      setIsSubmitting(false);
      return { success: false, error: "Invalid submission detected" };
    }

    // Validation for account_type to ensure admin cannot be selected
    if (!['user', 'educator'].includes(data.account_type)) {
      const errorMsg = "Please select a valid account type: Standard Member or Educator.";
      console.log('❌ Invalid account type:', data.account_type);
      toast({
        variant: "destructive",
        title: "Invalid Account Type",
        description: errorMsg,
      });
      setIsSubmitting(false);
      return { success: false, error: errorMsg };
    }

    try {
      console.log("✅ Submitting account request to database:", data);
      
      // Direct Supabase call
      const result = await AccountRequest.create(data);
      
      console.log("🎉 Account request created successfully:", result);

      toast({
        title: "Success!",
        description: `Your ${data.account_type === 'educator' ? 'Educator' : 'Standard Member'} request has been submitted successfully. You will receive an email notification once it's reviewed.`,
      });

      setLastSubmission(now);
      form.reset();
      setIsSubmitting(false);
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to submit account request:", error);
      
      const userFriendlyError = getErrorMessage(error);
      
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: userFriendlyError,
      });
      
      setIsSubmitting(false);
      return { success: false, error: userFriendlyError };
    }
  };

  return {
    form,
    onSubmit,
    canSubmit: !isSubmitting,
    isSubmitting,
  };
};
