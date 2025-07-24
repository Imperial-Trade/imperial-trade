import React, { memo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface MarketEventFiltersProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  currency: string;
  onCurrencyChange: (value: string) => void;
  impact: string;
  onImpactChange: (value: string) => void;
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

const MarketEventFilters = memo(({
  dateRange,
  onDateRangeChange,
  currency,
  onCurrencyChange,
  impact,
  onImpactChange,
  isLoading,
  lastUpdated,
  onRefresh
}: MarketEventFiltersProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-36 bg-background/50 border-border/50">
            <SelectValue placeholder="Time Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="next_week">Next Week</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger className="w-32 bg-background/50 border-border/50">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All...</SelectItem>
            <SelectItem value="USD">🇺🇸 USD</SelectItem>
            <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
            <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
            <SelectItem value="JPY">🇯🇵 JPY</SelectItem>
            <SelectItem value="CAD">🇨🇦 CAD</SelectItem>
          </SelectContent>
        </Select>

        <Select value={impact} onValueChange={onImpactChange}>
          <SelectTrigger className="w-36 bg-background/50 border-border/50">
            <SelectValue placeholder="Impact Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Impact</SelectItem>
            <SelectItem value="high">🌶️🌶️🌶️ High</SelectItem>
            <SelectItem value="medium">🌶️🌶️ Medium</SelectItem>
            <SelectItem value="low">🌶️ Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Last updated: {format(lastUpdated, 'HH:mm')}</span>
          </div>
        )}
        
        <Button
          onClick={onRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="bg-background/50 border-border/50 hover:bg-background/70"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
});

MarketEventFilters.displayName = 'MarketEventFilters';

export default MarketEventFilters;