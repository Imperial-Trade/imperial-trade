
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountRequestSchema, type AccountRequestFormData } from "@/lib/validations/accountRequestSchema";
import { useToast } from "@/hooks/use-toast";
import { AccountRequest, AccountRequestData } from "@/api/entities/AccountRequest";
import { useState } from "react";
import { validateAccountRequestData } from "@/lib/validations/accountRequestValidation";
import { LEGAL_VERSION } from "@/lib/constants/legal";

// Error message mapping for user-friendly error display
const getErrorMessage = (error: any): string => {
  console.log("🔍 Full error object:", error);
  
  // Check for unique constraint violation (email already exists)
  if (error?.message?.includes('already exists') || error?.message?.includes('account_requests_email_unique')) {
    return "An account request with this email already exists. Please click the 'Check Request Status' button below to view or update your request.";
  }
  
  // Check for rate limiting errors
  if (error?.message?.includes('Too many requests') || error?.message?.includes('rate limit')) {
    return error.message; // Pass through the detailed rate limit message
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
      accept_legal: false, // Must be checked to submit
    },
    mode: "onChange", // Real-time validation
  });

  const onSubmit = async (data: AccountRequestFormData): Promise<{ success: boolean; error?: string }> => {
    console.log('🚀 Account request submission started');
    console.log('📋 Form data:', data);
    
    setIsSubmitting(true);

    // Honeypot check
    if (data.website && data.website.length > 0) {
      console.log('🤖 Bot detected via honeypot');
      setIsSubmitting(false);
      return { success: false, error: "Invalid submission detected" };
    }

    // Additional validation using shared validator
    const validation = validateAccountRequestData(data);
    if (!validation.isValid) {
      const firstError = validation.errors[0];
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: firstError.message,
      });
      setIsSubmitting(false);
      return { success: false, error: firstError.message };
    }

    try {
      console.log("✅ Submitting account request to database:", data);
      
      // Convert form data to AccountRequestData format
      const baseRequestData: any = {
        email: data.email,
        full_name: data.full_name,
        phone_number: data.phone_number,
        vt_market_account_number: data.vt_market_account_number,
        referrer: data.referrer,
        account_type: data.account_type as 'user' | 'educator',
        reason: data.reason,
        website: data.website,
      };

      // Persist legal acceptance (single checkbox)
      const requestData = {
        ...baseRequestData,
        legal_accepted: true,
        legal_accepted_at: new Date().toISOString(),
        legal_version: LEGAL_VERSION,
      } as unknown as AccountRequestData;
      
      // Use the AccountRequest entity with integrated rate limiting
      const result = await AccountRequest.create(requestData);
      
      console.log("🎉 Account request created successfully:", result);

      toast({
        title: "Success!",
        description: `Your ${data.account_type === 'educator' ? 'Educator' : 'Standard Member'} request has been submitted successfully. You will receive an email notification once it's reviewed.`,
      });

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
