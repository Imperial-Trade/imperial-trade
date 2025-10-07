
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
  Users,
  Plus,
  Bell
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
  canCreateSignals?: boolean;
  onCreateSignal?: () => void;
}

export function SignalStreamFilters({
  filters,
  onFiltersChange,
  educatorOptions,
  signalCounts,
  canCreateSignals,
  onCreateSignal
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

  // Safely call native stopImmediatePropagation if available (TS-safe)
  const stopImmediate = (e: React.MouseEvent) => {
    const ne = e.nativeEvent as any;
    if (ne && typeof ne.stopImmediatePropagation === 'function') {
      ne.stopImmediatePropagation();
    }
  };

  const handleStatusClick = (e: React.MouseEvent, statusValue: string) => {
    e.preventDefault();
    e.stopPropagation();
    stopImmediate(e);
    updateFilter('status', statusValue);
  };

  const handleTradeTypeClick = (e: React.MouseEvent, tradeTypeValue: string) => {
    e.preventDefault();
    e.stopPropagation();
    stopImmediate(e);
    updateFilter('tradeType', tradeTypeValue);
  };

  const handleCreateSignalClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stopImmediate(e);
    if (onCreateSignal) {
      onCreateSignal();
    }
  };

  const handleClearFilterClick = (e: React.MouseEvent, key: keyof FilterState) => {
    e.preventDefault();
    e.stopPropagation();
    stopImmediate(e);
    clearFilter(key);
  };

  const handleClearAllClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stopImmediate(e);
    clearAllFilters();
  };

  return (
    <Card 
      className="mb-6 bg-card/80 backdrop-blur-sm border-border/40 hover:border-lightGreenHover dark:hover:border-primary/30 transition-all duration-300"
      data-prevent-widget-open="true"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
    >
      <CardContent className="p-4 space-y-4">
        {/* Enhanced Uniform Layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* Search Section - Consistent sizing */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10 pointer-events-none" />
              
              {/* Enhanced Gradient Placeholder */}
              {!filters.search && (
                <div className="absolute left-10 top-1/2 transform -translate-y-1/2 pointer-events-none text-sm text-muted-foreground z-10">
                  Search{' '}
                  <span className="bg-gradient-to-r from-primary/80 via-accent to-primary bg-clip-text text-transparent font-medium">
                    Xeon alerts
                  </span>
                  <span>...</span>
                </div>
              )}
              
              <Input
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="h-10 pl-10 pr-10 text-sm bg-background/60 backdrop-blur-sm border-border/60 focus:border-primary/70 hover:border-border transition-all duration-200 rounded-lg shadow-sm"
              />
              
              {filters.search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleClearFilterClick(e, 'search')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors z-10 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filters Section - Uniform grid layout */}
          <div className="flex flex-col sm:flex-row lg:flex-row items-stretch gap-3 lg:min-w-fit">
            
            {/* Filter Controls - All same height */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 sm:flex-none">
              {/* Status Filter */}
              <div className="min-w-0 sm:min-w-[140px] relative">
                <Bell className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="w-full h-10 pl-10 pr-3 text-sm font-medium text-foreground bg-background/80 backdrop-blur-sm border border-border/60 rounded-lg focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-border transition-all duration-200 shadow-sm z-50"
                  style={{ 
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none'
                  }}
                >
                  {statusOptions.map(option => (
                    <option 
                      key={option.value} 
                      value={option.value} 
                      className="text-foreground bg-background"
                    >
                      {option.label} ({option.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Trade Type Filter */}
              <div className="min-w-0 sm:min-w-[140px]">
                <select
                  value={filters.tradeType}
                  onChange={(e) => updateFilter('tradeType', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium text-foreground bg-background/80 backdrop-blur-sm border border-border/60 rounded-lg focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-border transition-all duration-200 shadow-sm z-50"
                  style={{ 
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none'
                  }}
                >
                  {tradeTypeOptions.map(option => (
                    <option 
                      key={option.value} 
                      value={option.value} 
                      className="text-foreground bg-background"
                    >
                      {option.label} ({option.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Educator Filter */}
              {educatorOptions.length > 1 && (
                <div className="min-w-0 sm:min-w-[140px]">
                  <select
                    value={filters.educator}
                    onChange={(e) => updateFilter('educator', e.target.value)}
                    className="w-full h-10 px-3 text-sm font-medium text-foreground bg-background/80 backdrop-blur-sm border border-border/60 rounded-lg focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-border transition-all duration-200 shadow-sm z-50"
                    style={{ 
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none'
                    }}
                  >
                    <option 
                      value="" 
                      className="text-foreground bg-background"
                    >
                      All Educators ({educatorOptions.length})
                    </option>
                    {educatorOptions.map(educator => (
                      <option 
                        key={educator.id} 
                        value={educator.id} 
                        className="text-foreground bg-background"
                      >
                        {educator.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {/* Action Buttons - Same height as filters */}
            <div className="flex items-center gap-3 justify-end sm:justify-start">
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllClick}
                  className="h-10 px-4 text-sm font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-all duration-200 rounded-lg backdrop-blur-sm min-w-[100px]"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
              
               {canCreateSignals && (
                <Button 
                  type="button"
                  onClick={handleCreateSignalClick}
                  className="h-10 px-4 text-sm font-bold bg-black hover:bg-black/90 border border-yellow-400/30 hover:border-yellow-400/50 transition-all duration-300 rounded-lg min-w-[120px] hover:scale-[1.02] shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2 text-yellow-400" />
                  <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-600 bg-clip-text text-transparent font-bold">Create Alert</span>
                </Button>
              )}
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
