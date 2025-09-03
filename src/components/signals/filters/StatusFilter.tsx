import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
  signalCounts: {
    total: number;
    active: number;
    closed: number;
  };
}

export function StatusFilter({ value, onChange, signalCounts }: StatusFilterProps) {
  const statusOptions = [
    { value: '', label: 'All Status', count: signalCounts.total, icon: Filter },
    { value: 'active', label: 'Active', count: signalCounts.active, icon: Clock },
    { value: 'closed', label: 'Closed', count: signalCounts.closed, icon: CheckCircle }
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Status</label>
      <div className="flex flex-wrap gap-1.5">
        {statusOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          
          return (
            <Button
              key={option.value}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(option.value)}
              className={cn(
                "h-8 px-3 text-xs transition-all duration-200",
                isSelected 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-3 h-3 mr-1.5" />
              {option.label}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-background/20 text-xs">
                {option.count}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}