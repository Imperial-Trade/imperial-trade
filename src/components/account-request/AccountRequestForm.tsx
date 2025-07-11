import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { User, Mail, Shield, Send, Phone, Clock, AlertTriangle } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { AccountRequestFormData } from "@/lib/validations/accountRequestSchema";
import { EnhancedHoneypotFields } from "@/components/security/EnhancedHoneypotFields";
import { ValidationFeedback } from "@/components/security/ValidationFeedback";
import { BotProtectionWrapper } from "@/components/security/BotProtectionWrapper";
import { useAdvancedBotProtection } from "@/hooks/useAdvancedBotProtection";
import { useAdaptiveRateLimit } from "@/hooks/useAdaptiveRateLimit";
import { AdaptiveRateLimitStatus } from "@/components/account-request/AdaptiveRateLimitStatus";

interface AccountRequestFormProps {
  form: UseFormReturn<AccountRequestFormData>;
  onSubmit: (data: AccountRequestFormData) => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  attemptsLeft?: number;
  nextAttemptDelay?: number;
  getDelayMessage?: (delay: number) => string;
  maxAttempts?: number;
}

export const AccountRequestForm: React.FC<AccountRequestFormProps> = ({
  form,
  onSubmit,
  isSubmitting,
  canSubmit,
  attemptsLeft = 0,
  nextAttemptDelay = 0,
  getDelayMessage,
  maxAttempts = 5,
}) => {
  const { protectionResult, analyzeSubmission, handleFieldFocus } = useAdvancedBotProtection();

  // 🧠 NEW PHASE 4: Adaptive rate limiting integration
  const adaptiveRateLimit = useAdaptiveRateLimit({
    identifier: 'user-ip', // In production, use actual IP or user identifier
    email: form.watch('email') || '',
    securityAnalysis: protectionResult,
    behavioralAnalysis: { suspiciousScore: 0, reasons: [] }, // Placeholder
  });

  const handleSubmit = async (data: AccountRequestFormData) => {
    console.log('🚀 Form submission started with Phase 4 adaptive protection');
    
    // Run advanced bot protection analysis
    const botAnalysis = await analyzeSubmission(data);
    
    // If definitely a bot, block submission
    if (botAnalysis.isBot) {
      console.log('🚫 Submission blocked - Bot detected:', botAnalysis);
      return; // Silent fail for bots
    }
    
    // Check adaptive rate limits
    if (!adaptiveRateLimit.canSubmit) {
      console.log('🚫 Submission blocked by adaptive rate limiting');
      return;
    }
    
    // If requires CAPTCHA, show warning but allow submission for now
    // In production, you'd integrate with reCAPTCHA here
    if (botAnalysis.requiresCaptcha || adaptiveRateLimit.requiresCaptcha) {
      console.log('⚠️ CAPTCHA required but proceeding:', botAnalysis);
    }
    
    onSubmit(data);
    
    // Record result for adaptive learning
    setTimeout(() => {
      adaptiveRateLimit.recordSubmissionResult(true); // Assume success for now
    }, 1000);
  };

  const getRateLimitStatus = () => {
    // Use adaptive rate limit status if available
    if (adaptiveRateLimit.isAdapting) {
      return {
        type: 'info' as const,
        message: 'Analyzing security profile...',
        icon: <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />,
      };
    }

    if (!adaptiveRateLimit.canSubmit) {
      return {
        type: 'error' as const,
        message: adaptiveRateLimit.getStatusMessage(),
        icon: <Clock className="w-4 h-4" />,
      };
    }

    if (adaptiveRateLimit.requiresCaptcha || adaptiveRateLimit.additionalVerification) {
      return {
        type: 'warning' as const,
        message: adaptiveRateLimit.getStatusMessage(),
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    }

    // Fallback to original rate limiting
    if (canSubmit) {
      if (attemptsLeft < maxAttempts) {
        return {
          type: 'warning' as const,
          message: `${attemptsLeft} attempts remaining`,
          icon: <AlertTriangle className="w-4 h-4" />,
        };
      }
      return null;
    }

    const delayMessage = getDelayMessage?.(nextAttemptDelay || 0);
    return {
      type: 'error' as const,
      message: delayMessage || 'Rate limit reached. Please wait before trying again.',
      icon: <Clock className="w-4 h-4" />,
    };
  };

  const rateLimitStatus = getRateLimitStatus();

  return (
    <div className="account-request-form-container space-y-4">
      <BotProtectionWrapper
        isProtected={protectionResult?.isBot || false}
        confidence={protectionResult?.confidence || 0}
        reasons={protectionResult?.reasons || []}
      >
        {/* 🧠 NEW PHASE 4: Adaptive Rate Limit Status Display */}
        <AdaptiveRateLimitStatus
          trustScore={adaptiveRateLimit.trustScore}
          riskCategory={adaptiveRateLimit.riskCategory}
          threatLevel={adaptiveRateLimit.threatLevel}
          attemptsLeft={adaptiveRateLimit.attemptsLeft}
          requiresCaptcha={adaptiveRateLimit.requiresCaptcha}
          additionalVerification={adaptiveRateLimit.additionalVerification}
          systemLoad={adaptiveRateLimit.systemLoad}
          isAdapting={adaptiveRateLimit.isAdapting}
          statusMessage={adaptiveRateLimit.getStatusMessage()}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="form-grid">
            <EnhancedHoneypotFields form={form} />
            
            {/* Rate Limit Status Display */}
            {rateLimitStatus && (
              <div className={`p-3 rounded-md border flex items-center gap-2 text-sm font-medium ${
                rateLimitStatus.type === 'warning' 
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                  : rateLimitStatus.type === 'info'
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {rateLimitStatus.icon}
                {rateLimitStatus.message}
              </div>
            )}
            
            <div className="form-fields">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">Full Name</FormLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your full name"
                          className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:text-gray-900 focus:bg-white font-medium"
                          style={{ 
                            color: '#1f2937 !important',
                            backgroundColor: '#ffffff !important'
                          }}
                          onFocus={() => handleFieldFocus('full_name')}
                        />
                      </FormControl>
                    </div>
                    <ValidationFeedback 
                      error={fieldState.error}
                      isValid={!fieldState.error && field.value?.length > 0}
                      value={field.value}
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">VT Market Email Address</FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your VT Market email address"
                          className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:text-gray-900 focus:bg-white font-medium"
                          style={{ 
                            color: '#1f2937 !important',
                            backgroundColor: '#ffffff !important'
                          }}
                          onFocus={() => handleFieldFocus('email')}
                        />
                      </FormControl>
                    </div>
                    <ValidationFeedback 
                      error={fieldState.error}
                      isValid={!fieldState.error && field.value?.length > 0}
                      value={field.value}
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">Phone Number</FormLabel>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="Enter your phone number"
                          className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:text-gray-900 focus:bg-white font-medium"
                          style={{ 
                            color: '#1f2937 !important',
                            backgroundColor: '#ffffff !important'
                          }}
                          onFocus={() => handleFieldFocus('phone_number')}
                        />
                      </FormControl>
                    </div>
                    <ValidationFeedback 
                      error={fieldState.error}
                      isValid={!fieldState.error && field.value?.length > 0}
                      value={field.value}
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vt_market_account_number"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">VT Market Account Number</FormLabel>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your VT Market account number"
                          className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:text-gray-900 focus:bg-white font-medium"
                          style={{ 
                            color: '#1f2937 !important',
                            backgroundColor: '#ffffff !important'
                          }}
                          onFocus={() => handleFieldFocus('vt_market_account_number')}
                        />
                      </FormControl>
                    </div>
                    <ValidationFeedback 
                      error={fieldState.error}
                      isValid={!fieldState.error && field.value?.length > 0}
                      value={field.value}
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referrer"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">Referrer (Optional)</FormLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Who referred you? (Optional)"
                          className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:text-gray-900 focus:bg-white font-medium"
                          style={{ 
                            color: '#1f2937 !important',
                            backgroundColor: '#ffffff !important'
                          }}
                          onFocus={() => handleFieldFocus('referrer')}
                        />
                      </FormControl>
                    </div>
                    <ValidationFeedback 
                      error={fieldState.error}
                      isValid={!fieldState.error && field.value?.length > 0}
                      value={field.value}
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_type"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger 
                          className="bg-white border-gray-300 text-gray-900 hover:bg-white focus:bg-white font-medium"
                          onFocus={() => handleFieldFocus('account_type')}
                        >
                          <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-gray-500" />
                            <SelectValue 
                              placeholder="Select account type" 
                              className="text-gray-900 font-medium"
                              style={{ color: '#1f2937 !important' }}
                            />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="user" className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100 font-medium">
                          Standard Member
                        </SelectItem>
                        <SelectItem value="educator" className="text-gray-900 hover:bg-gray-100 focus:bg-gray-100 font-medium">
                          Educator / IB Partner
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <ValidationFeedback 
                      error={fieldState.error}
                      isValid={!fieldState.error && field.value?.length > 0}
                      value={field.value}
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-white font-medium">
                      Why do you want to join? (10-500 characters)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Briefly state why you want to join (e.g., 'Referred by John Doe', 'Interested in IB program', etc.)"
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:text-gray-900 focus:bg-white font-medium resize-none"
                        rows={3}
                        style={{ 
                          color: '#1f2937 !important',
                          backgroundColor: '#ffffff !important'
                        }}
                        onFocus={() => handleFieldFocus('reason')}
                      />
                    </FormControl>
                    <div className="flex justify-end">
                      <span className="text-xs text-gray-300 font-medium">
                        {field.value?.length || 0}/500
                      </span>
                    </div>
                    <ValidationFeedback 
                      error={fieldState.error}
                      isValid={!fieldState.error && field.value?.length >= 10}
                      value={field.value}
                    />
                  </FormItem>
                )}
              />
            </div>

            <div className="form-actions">
              <Button
                type="submit"
                disabled={isSubmitting || !adaptiveRateLimit.canSubmit || protectionResult?.isBot}
                className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </BotProtectionWrapper>
    </div>
  );
};
