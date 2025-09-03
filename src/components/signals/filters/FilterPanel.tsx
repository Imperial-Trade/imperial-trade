import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SearchFilter } from './SearchFilter';
import { StatusFilter } from './StatusFilter';
import { TradeTypeFilter } from './TradeTypeFilter';
import { EducatorFilter } from './EducatorFilter';
import { ActiveFilters } from './ActiveFilters';
import { FilterActions } from './FilterActions';

interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
}

interface FilterPanelProps {
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
  canCreateSignals?: boolean;
  onCreateSignal?: () => void;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  educatorOptions,
  signalCounts,
  canCreateSignals,
  onCreateSignal
}: FilterPanelProps) {
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

  return (
    <Card className="mb-6 bg-card/95 backdrop-blur-sm border-border/50 shadow-lg">
      <CardContent className="p-4 space-y-4">
        {/* Top Row: Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 max-w-md">
            <SearchFilter 
              value={filters.search}
              onChange={(value) => updateFilter('search', value)}
              onClear={() => clearFilter('search')}
            />
          </div>
          
          <FilterActions 
            hasActiveFilters={hasActiveFilters}
            canCreateSignals={canCreateSignals}
            onClearAll={clearAllFilters}
            onCreateSignal={onCreateSignal}
          />
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatusFilter
            value={filters.status}
            onChange={(value) => updateFilter('status', value)}
            signalCounts={signalCounts}
          />
          
          <TradeTypeFilter
            value={filters.tradeType}
            onChange={(value) => updateFilter('tradeType', value)}
            signalCounts={signalCounts}
          />
          
          {educatorOptions.length > 1 && (
            <EducatorFilter
              value={filters.educator}
              onChange={(value) => updateFilter('educator', value)}
              educatorOptions={educatorOptions}
            />
          )}
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <ActiveFilters
            filters={filters}
            educatorOptions={educatorOptions}
            signalCounts={signalCounts}
            onClearFilter={clearFilter}
          />
        )}
      </CardContent>
    </Card>
  );
}