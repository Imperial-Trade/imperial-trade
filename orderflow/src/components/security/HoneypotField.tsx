
import React from 'react';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { AccountRequestFormData } from '@/lib/validations/accountRequestSchema';

interface HoneypotFieldProps {
  form: UseFormReturn<AccountRequestFormData>;
}

export const HoneypotField: React.FC<HoneypotFieldProps> = ({ form }) => {
  return (
    <div style={{ display: 'none' }} aria-hidden="true">
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
  );
};
