import React from "react";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import { AccountRequestFormData } from "@/lib/validations/accountRequestSchema";

interface EnhancedHoneypotFieldsProps {
  form: UseFormReturn<AccountRequestFormData>;
}

export const EnhancedHoneypotFields: React.FC<EnhancedHoneypotFieldsProps> = ({
  form,
}) => {
  return (
    <>
      {/* Original honeypot field */}
      <div style={{ display: "none" }} aria-hidden="true">
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
                  placeholder="Do not fill this field"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* CSS-based invisible honeypots */}
      <div
        className="opacity-0 absolute -left-[9999px] pointer-events-none"
        aria-hidden="true"
      >
        <input
          type="text"
          name="company_name"
          autoComplete="off"
          tabIndex={-1}
          onChange={() => {
            // Silent detection - mark as bot if filled
            logger.log("Bot detected: invisible honeypot filled");
          }}
        />
        <input
          type="email"
          name="backup_email"
          autoComplete="off"
          tabIndex={-1}
          onChange={() => {
            logger.log("Bot detected: backup email honeypot filled");
          }}
        />
        <textarea
          name="additional_info"
          autoComplete="off"
          tabIndex={-1}
          onChange={() => {
            logger.log("Bot detected: textarea honeypot filled");
          }}
        />
      </div>

      {/* Time-based honeypot - hidden field that should remain empty for at least 3 seconds */}
      <input
        type="hidden"
        name="form_loaded_at"
        value={Date.now().toString()}
        readOnly
      />
    </>
  );
};
