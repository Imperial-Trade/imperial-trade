
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountRequestSchema, type AccountRequestFormData } from "@/lib/validations/accountRequestSchema";
import { useRateLimiting } from "./useRateLimiting";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

export const useOptimizedAccountRequestForm = () => {
  const { toast } = useToast();
  const { canSubmit, recordAttempt } = useRateLimiting('account-request', 3, 60 * 60 * 1000);

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
      website: "",
    },
    mode: "onChange",
  });

  const onSubmit = useCallback(async (data: AccountRequestFormData) => {
    if (!canSubmit) {
      toast({
        variant: "destructive",
        title: "Too Many Attempts",
        description: "Please wait before submitting another request.",
      });
      return;
    }

    if (data.website && data.website.length > 0) {
      console.log("Bot detected via honeypot");
      return;
    }

    try {
      recordAttempt();
      
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
  }, [canSubmit, recordAttempt, form, toast]);

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    canSubmit,
    isSubmitting: form.formState.isSubmitting,
  };
};
