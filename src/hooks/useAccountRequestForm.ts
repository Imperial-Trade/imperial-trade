
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountRequestSchema, type AccountRequestFormData } from "@/lib/validations/accountRequestSchema";
import { useRateLimiting } from "./useRateLimiting";
import { useToast } from "@/hooks/use-toast";
import { AccountRequest } from "@/api/entities";

export const useAccountRequestForm = () => {
  const { toast } = useToast();
  const { canSubmit, recordAttempt } = useRateLimiting('account-request', 3, 60 * 60 * 1000); // 3 attempts per hour

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

  const onSubmit = async (data: AccountRequestFormData) => {
    if (!canSubmit) {
      toast({
        variant: "destructive",
        title: "Too Many Attempts",
        description: "Please wait before submitting another request.",
      });
      return;
    }

    // Check honeypot - silent fail for bots
    if (data.website && data.website.length > 0) {
      console.log("Bot detected via honeypot");
      return;
    }

    try {
      recordAttempt();
      
      // Use direct Supabase call instead of REST API
      await AccountRequest.create(data);

      toast({
        title: "Success!",
        description: "Your request has been submitted successfully.",
      });

      form.reset();
    } catch (error) {
      console.error("Failed to submit account request:", error);
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
