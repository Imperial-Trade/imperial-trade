
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountRequestSchema, type AccountRequestFormData } from "@/lib/validations/accountRequestSchema";
import { useRateLimiting } from "./useRateLimiting";
import { useToast } from "@/hooks/use-toast";

export const useAccountRequestForm = () => {
  const { toast } = useToast();
  const { canSubmit, recordAttempt } = useRateLimiting('account-request', 3, 60 * 60 * 1000); // 3 attempts per hour

  const form = useForm<AccountRequestFormData>({
    resolver: zodResolver(accountRequestSchema),
    defaultValues: {
      full_name: "",
      email: "",
      account_type: "user",
      reason: "",
      website: "", // Honeypot field
    },
    mode: "onChange", // Real-time validation
  });

  const onSubmit = async (data: AccountRequestFormData) => {
    if (!canSubmit) {
      toast({
        variant: "destructive",
        title: "Too Many Attempts",
        description: "Please wait before submitting another request.",
      });
      return;
    }

    // Check honeypot
    if (data.website && data.website.length > 0) {
      console.log("Bot detected via honeypot");
      return; // Silent fail for bots
    }

    try {
      recordAttempt();
      
      // Your existing submission logic here
      const response = await fetch('/api/account-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      toast({
        title: "Success!",
        description: "Your request has been submitted successfully.",
      });

      form.reset();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit your request. Please try again.",
      });
    }
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    canSubmit,
    isSubmitting: form.formState.isSubmitting,
  };
};
