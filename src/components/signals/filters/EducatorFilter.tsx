import React from 'react';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EducatorFilterProps {
  value: string;
  onChange: (value: string) => void;
  educatorOptions: Array<{ id: string; name: string }>;
}

export function EducatorFilter({ value, onChange, educatorOptions }: EducatorFilterProps) {
  const allEducatorsOption = {
    id: '',
    name: `All Educators (${educatorOptions.length})`
  };

  const options = [allEducatorsOption, ...educatorOptions];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Educator</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isSelected = value === option.id;
          const isAll = option.id === '';
          
          return (
            <Button
              key={option.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(option.id)}
              className={cn(
                "h-8 px-3 text-xs transition-all duration-200",
                isSelected 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {isAll && <Users className="w-3 h-3 mr-1.5" />}
              <span className="truncate max-w-24">{option.name}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}