import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InputWithSuffixProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suffix: string;
  className?: string;
}

const InputWithSuffix = React.forwardRef<HTMLInputElement, InputWithSuffixProps>(
  ({ suffix, className, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          className={cn("pr-12", className)}
        />
        <span 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none"
          aria-hidden="true"
        >
          {suffix}
        </span>
      </div>
    );
  }
);

InputWithSuffix.displayName = "InputWithSuffix";

export { InputWithSuffix };