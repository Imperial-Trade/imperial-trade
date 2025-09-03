
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
  Plus
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
      <CardContent className="p-3 space-y-3">
        {/* Compact Top Bar with Search and Clear */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search signals..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-9 pr-8 h-8 text-sm bg-background/50 border-border/60 focus:border-primary/50 transition-colors"
            />
            {filters.search && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => handleClearFilterClick(e, 'search')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAllClick}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30"
              >
                <X className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            )}
            {canCreateSignals && (
              <Button 
                type="button"
                onClick={handleCreateSignalClick}
                className="h-8 px-3 text-xs bg-foreground text-background hover:bg-foreground/90 border border-border"
              >
                <Plus className="w-3 h-3 mr-1" />
                Create Pattern
              </Button>
            )}
          </div>
        </div>

        {/* Premium Filter Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Status Filter */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full h-7 px-2.5 text-xs bg-background border border-border/60 rounded-md focus:border-primary/50 focus:outline-none transition-colors z-50"
            >
              {statusOptions.map(option => {
                const Icon = option.icon;
                return (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Trade Type Filters */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</span>
            <div className="flex flex-wrap gap-1.5">
              {tradeTypeOptions.map(option => {
                const Icon = option.icon;
                const isActive = filters.tradeType === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => handleTradeTypeClick(e, option.value)}
                    className={`h-7 px-2.5 text-xs transition-all duration-200 group ${
                      isActive 
                        ? "bg-primary/90 border-primary/20 shadow-sm shadow-primary/20" 
                        : "bg-background/50 border-border/60 hover:bg-accent/50 hover:border-lightGreenHover dark:hover:border-primary/30"
                    }`}
                  >
                    <Icon className="w-3 h-3 mr-1.5" />
                    <span className="hidden sm:inline">{option.label}</span>
                    <Badge 
                      variant="secondary" 
                      className={`ml-1.5 h-4 px-1.5 text-[10px] ${
                        isActive 
                          ? "bg-primary-foreground/20 text-primary-foreground" 
                          : "bg-muted/50"
                      }`}
                    >
                      {option.count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Educator Filter */}
          {educatorOptions.length > 1 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Educator</span>
              <select
                value={filters.educator}
                onChange={(e) => updateFilter('educator', e.target.value)}
                className="w-full h-7 px-2.5 text-xs bg-background/50 border border-border/60 rounded-md focus:border-primary/50 focus:outline-none transition-colors"
              >
                <option value="">All Educators ({educatorOptions.length})</option>
                {educatorOptions.map(educator => (
                  <option key={educator.id} value={educator.id}>
                    {educator.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Minimal Active Filter Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
            {filters.search && (
              <Badge variant="outline" className="h-6 px-2 text-xs bg-background/50 border-border/60 flex items-center gap-1">
                <Search className="w-3 h-3" />
                "{filters.search}"
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleClearFilterClick(e, 'search')}
                  className="h-4 w-4 p-0 ml-1 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-2.5 h-2.5" />
                </Button>
              </Badge>
            )}
            {filters.status && (
              <Badge variant="outline" className="h-6 px-2 text-xs bg-background/50 border-border/60 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {statusOptions.find(o => o.value === filters.status)?.label}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleClearFilterClick(e, 'status')}
                  className="h-4 w-4 p-0 ml-1 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-2.5 h-2.5" />
                </Button>
              </Badge>
            )}
            {filters.tradeType && (
              <Badge variant="outline" className="h-6 px-2 text-xs bg-background/50 border-border/60 flex items-center gap-1">
                {filters.tradeType === 'buy' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {tradeTypeOptions.find(o => o.value === filters.tradeType)?.label}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleClearFilterClick(e, 'tradeType')}
                  className="h-4 w-4 p-0 ml-1 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-2.5 h-2.5" />
                </Button>
              </Badge>
            )}
            {filters.educator && (
              <Badge variant="outline" className="h-6 px-2 text-xs bg-background/50 border-border/60 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {educatorOptions.find(e => e.id === filters.educator)?.name}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleClearFilterClick(e, 'educator')}
                  className="h-4 w-4 p-0 ml-1 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-2.5 h-2.5" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
