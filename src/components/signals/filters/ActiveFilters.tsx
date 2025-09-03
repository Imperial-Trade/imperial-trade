import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Search, Clock, CheckCircle, TrendingUp, TrendingDown, Users } from 'lucide-react';

interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
}

interface ActiveFiltersProps {
  filters: FilterState;
  educatorOptions: Array<{ id: string; name: string }>;
  signalCounts: {
    total: number;
    active: number;
    closed: number;
    buy: number;
    sell: number;
  };
  onClearFilter: (key: keyof FilterState) => void;
}

export function ActiveFilters({ filters, educatorOptions, signalCounts, onClearFilter }: ActiveFiltersProps) {
  const statusOptions = [
    { value: 'active', label: 'Active', icon: Clock },
    { value: 'closed', label: 'Closed', icon: CheckCircle }
  ];

  const tradeTypeOptions = [
    { value: 'buy', label: 'Buy Orders', icon: TrendingUp },
    { value: 'sell', label: 'Sell Orders', icon: TrendingDown }
  ];

  return (
    <div className="pt-3 border-t border-border/30">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-muted-foreground">Active Filters:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filters.search && (
          <Badge variant="outline" className="h-7 px-3 text-xs bg-background/80 border-border/60 flex items-center gap-2">
            <Search className="w-3 h-3" />
            <span>"{filters.search}"</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onClearFilter('search')}
              className="h-4 w-4 p-0 ml-1 hover:bg-destructive/10 hover:text-destructive rounded-full"
            >
              <X className="w-2.5 h-2.5" />
            </Button>
          </Badge>
        )}
        
        {filters.status && (
          <Badge variant="outline" className="h-7 px-3 text-xs bg-background/80 border-border/60 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>{statusOptions.find(o => o.value === filters.status)?.label}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onClearFilter('status')}
              className="h-4 w-4 p-0 ml-1 hover:bg-destructive/10 hover:text-destructive rounded-full"
            >
              <X className="w-2.5 h-2.5" />
            </Button>
          </Badge>
        )}
        
        {filters.tradeType && (
          <Badge variant="outline" className="h-7 px-3 text-xs bg-background/80 border-border/60 flex items-center gap-2">
            {filters.tradeType === 'buy' ? (
              <TrendingUp className="w-3 h-3 text-green-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-600" />
            )}
            <span>{tradeTypeOptions.find(o => o.value === filters.tradeType)?.label}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onClearFilter('tradeType')}
              className="h-4 w-4 p-0 ml-1 hover:bg-destructive/10 hover:text-destructive rounded-full"
            >
              <X className="w-2.5 h-2.5" />
            </Button>
          </Badge>
        )}
        
        {filters.educator && (
          <Badge variant="outline" className="h-7 px-3 text-xs bg-background/80 border-border/60 flex items-center gap-2">
            <Users className="w-3 h-3" />
            <span>{educatorOptions.find(e => e.id === filters.educator)?.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onClearFilter('educator')}
              className="h-4 w-4 p-0 ml-1 hover:bg-destructive/10 hover:text-destructive rounded-full"
            >
              <X className="w-2.5 h-2.5" />
            </Button>
          </Badge>
        )}
      </div>
    </div>
  );
}