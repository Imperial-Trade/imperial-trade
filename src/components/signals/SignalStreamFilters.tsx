import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  X, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  Users
} from 'lucide-react';

interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
}

interface SignalStreamFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  educatorOptions: Array<{ id: string; name: string }>;
  signalCounts: {
    total: number;
    active: number;
    closed: number;
    buy: number;
    sell: number;
  };
}

export function SignalStreamFilters({
  filters,
  onFiltersChange,
  educatorOptions,
  signalCounts
}: SignalStreamFiltersProps) {
  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof FilterState) => {
    onFiltersChange({ ...filters, [key]: '' });
  };

  const clearAllFilters = () => {
    onFiltersChange({ search: '', status: '', tradeType: '', educator: '' });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const statusOptions = [
    { value: '', label: 'All Status', count: signalCounts.total, icon: Filter },
    { value: 'active', label: 'Active', count: signalCounts.active, icon: Clock },
    { value: 'closed', label: 'Closed', count: signalCounts.closed, icon: CheckCircle }
  ];

  const tradeTypeOptions = [
    { value: '', label: 'All Types', count: signalCounts.total, icon: Filter },
    { value: 'buy', label: 'Buy Orders', count: signalCounts.buy, icon: TrendingUp },
    { value: 'sell', label: 'Sell Orders', count: signalCounts.sell, icon: TrendingDown }
  ];

  return (
    <Card className="mb-6">
      <CardContent className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search signals by asset, symbol, or educator..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10 pr-10"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearFilter('search')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <div className="flex gap-1">
            {statusOptions.map(option => {
              const Icon = option.icon;
              const isActive = filters.status === option.value;
              return (
                <Button
                  key={option.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter('status', option.value)}
                  className="h-8"
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {option.label}
                  <Badge 
                    variant="secondary" 
                    className="ml-2 h-4 text-xs"
                  >
                    {option.count}
                  </Badge>
                </Button>
              );
            })}
          </div>

          {/* Trade Type Filter */}
          <div className="flex gap-1">
            {tradeTypeOptions.map(option => {
              const Icon = option.icon;
              const isActive = filters.tradeType === option.value;
              return (
                <Button
                  key={option.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter('tradeType', option.value)}
                  className="h-8"
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {option.label}
                  <Badge 
                    variant="secondary" 
                    className="ml-2 h-4 text-xs"
                  >
                    {option.count}
                  </Badge>
                </Button>
              );
            })}
          </div>

          {/* Educator Filter */}
          {educatorOptions.length > 1 && (
            <select
              value={filters.educator}
              onChange={(e) => updateFilter('educator', e.target.value)}
              className="px-3 py-1 text-sm border border-input rounded-md bg-background h-8"
            >
              <option value="">All Educators ({educatorOptions.length})</option>
              {educatorOptions.map(educator => (
                <option key={educator.id} value={educator.id}>
                  {educator.name}
                </option>
              ))}
            </select>
          )}

          {/* Clear All Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-muted-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Active Filter Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Search: "{filters.search}"
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('search')}
                  className="h-3 w-3 p-0 ml-1"
                >
                  <X className="w-2 h-2" />
                </Button>
              </Badge>
            )}
            {filters.status && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {statusOptions.find(o => o.value === filters.status)?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('status')}
                  className="h-3 w-3 p-0 ml-1"
                >
                  <X className="w-2 h-2" />
                </Button>
              </Badge>
            )}
            {filters.tradeType && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Type: {tradeTypeOptions.find(o => o.value === filters.tradeType)?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('tradeType')}
                  className="h-3 w-3 p-0 ml-1"
                >
                  <X className="w-2 h-2" />
                </Button>
              </Badge>
            )}
            {filters.educator && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Educator: {educatorOptions.find(e => e.id === filters.educator)?.name}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilter('educator')}
                  className="h-3 w-3 p-0 ml-1"
                >
                  <X className="w-2 h-2" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}