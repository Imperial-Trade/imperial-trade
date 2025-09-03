import React from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeTypeFilterProps {
  value: string;
  onChange: (value: string) => void;
  signalCounts: {
    total: number;
    buy: number;
    sell: number;
  };
}

export function TradeTypeFilter({ value, onChange, signalCounts }: TradeTypeFilterProps) {
  const tradeTypeOptions = [
    { value: '', label: 'All Types', count: signalCounts.total, icon: Filter, color: '' },
    { value: 'buy', label: 'Buy', count: signalCounts.buy, icon: TrendingUp, color: 'text-green-600' },
    { value: 'sell', label: 'Sell', count: signalCounts.sell, icon: TrendingDown, color: 'text-red-600' }
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">Trade Type</label>
      <div className="flex flex-wrap gap-1.5">
        {tradeTypeOptions.map((option) => {
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
              <Icon className={cn("w-3 h-3 mr-1.5", isSelected ? "" : option.color)} />
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