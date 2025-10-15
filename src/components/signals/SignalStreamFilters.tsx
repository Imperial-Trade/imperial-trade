
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { MobileFilterButton } from './MobileFilterButton';
import { MobileFilterSheet } from './MobileFilterSheet';
import { GlassmorphismCreateButton } from './GlassmorphismCreateButton';

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
    buy: number;   // Combined buy + buy_limit
    sell: number;  // Combined sell + sell_limit
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
  const { isMobile } = useDeviceDetection();
  const [mobileSheetOpen, setMobileSheetOpen] = useState<'status' | 'tradeType' | 'educator' | null>(null);

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof FilterState) => {
    onFiltersChange({ ...filters, [key]: '' });
  };

  const clearAllFilters = () => {
    onFiltersChange({ search: '', status: 'all', tradeType: 'all', educator: 'all' });
  };

  const hasActiveFilters = filters.search !== '' || 
    (filters.status !== '' && filters.status !== 'all') ||
    (filters.tradeType !== '' && filters.tradeType !== 'all') ||
    (filters.educator !== '' && filters.educator !== 'all');

  const statusOptions = [
    { value: 'all', label: 'All Status', icon: Filter },
    { value: 'active', label: 'Active', icon: Clock },
    { value: 'closed', label: 'Closed', icon: CheckCircle }
  ];

  const tradeTypeOptions = [
    { 
      value: 'all', 
      label: 'All Types', 
      icon: Filter 
    },
    { value: 'buy', label: 'Buy Orders', icon: TrendingUp },
    { value: 'sell', label: 'Sell Orders', icon: TrendingDown }
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

  const handleCreateSignalClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      stopImmediate(e);
    }
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

  // Mobile Layout (< 768px)
  if (isMobile) {
    return (
      <>
        <Card 
          className="mb-4 bg-card/60 backdrop-blur-sm border-border/40"
          data-prevent-widget-open="true"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
        >
          <CardContent className="p-3 space-y-3">
            {/* Row 1: Search + Create Alert */}
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 z-10 pointer-events-none" />
                
                {!filters.search && (
                  <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none text-sm text-muted-foreground z-10">
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
                  className="h-10 pl-10 pr-10 text-sm bg-background/60 backdrop-blur-sm border-border/60"
                />
                
                {filters.search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleClearFilterClick(e, 'search')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Glassmorphism Create Alert Button */}
              {canCreateSignals && (
                <GlassmorphismCreateButton onClick={handleCreateSignalClick} />
              )}
            </div>

            {/* Row 2: Icon Filter Buttons */}
            <div className="flex items-center gap-2">
              {/* Status Filter Icon */}
              <MobileFilterButton
                icon={<Filter className="w-4 h-4" />}
                label="Filter by status"
                isActive={filters.status !== 'all' && filters.status !== ''}
                onClick={() => setMobileSheetOpen('status')}
              />
              
              {/* Trade Type Filter Icon */}
              <MobileFilterButton
                icon={<TrendingUp className="w-4 h-4" />}
                label="Filter by type"
                isActive={filters.tradeType !== 'all' && filters.tradeType !== ''}
                onClick={() => setMobileSheetOpen('tradeType')}
              />
              
              {/* Educator Filter Icon */}
              {educatorOptions.length > 1 && (
                <MobileFilterButton
                  icon={<Users className="w-4 h-4" />}
                  label="Filter by educator"
                  isActive={filters.educator !== 'all' && filters.educator !== ''}
                  onClick={() => setMobileSheetOpen('educator')}
                />
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Clear All Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllClick}
                  className="h-10 px-3 text-xs text-muted-foreground"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filter Sheets */}
        <MobileFilterSheet
          type="status"
          isOpen={mobileSheetOpen === 'status'}
          onClose={() => setMobileSheetOpen(null)}
          currentValue={filters.status}
          onValueChange={(value) => {
            updateFilter('status', value);
            setMobileSheetOpen(null);
          }}
          options={statusOptions}
        />

        <MobileFilterSheet
          type="tradeType"
          isOpen={mobileSheetOpen === 'tradeType'}
          onClose={() => setMobileSheetOpen(null)}
          currentValue={filters.tradeType}
          onValueChange={(value) => {
            updateFilter('tradeType', value);
            setMobileSheetOpen(null);
          }}
          options={tradeTypeOptions}
        />

        {educatorOptions.length > 1 && (
          <MobileFilterSheet
            type="educator"
            isOpen={mobileSheetOpen === 'educator'}
            onClose={() => setMobileSheetOpen(null)}
            currentValue={filters.educator}
            onValueChange={(value) => {
              updateFilter('educator', value);
              setMobileSheetOpen(null);
            }}
            educatorOptions={educatorOptions}
          />
        )}
      </>
    );
  }

  // Desktop Layout (>= 768px)
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
              <div className="min-w-0 sm:min-w-[140px]">
                <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                  <SelectTrigger className="w-full h-10 px-3 text-sm font-medium bg-background/80 backdrop-blur-sm border border-border/60 rounded-lg hover:border-border transition-all duration-200 shadow-sm">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border shadow-xl z-[100]">
                    {statusOptions.map(option => {
                      const Icon = option.icon;
                      return (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className="cursor-pointer hover:bg-accent focus:bg-accent"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Trade Type Filter */}
              <div className="min-w-0 sm:min-w-[140px]">
                <Select value={filters.tradeType} onValueChange={(value) => updateFilter('tradeType', value)}>
                  <SelectTrigger className="w-full h-10 px-3 text-sm font-medium bg-background/80 backdrop-blur-sm border border-border/60 rounded-lg hover:border-border transition-all duration-200 shadow-sm">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border shadow-xl z-[100]">
                    {tradeTypeOptions.map(option => {
                      const Icon = option.icon;
                      return (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className="cursor-pointer hover:bg-accent focus:bg-accent"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Educator Filter */}
              {educatorOptions.length > 1 && (
                <div className="min-w-0 sm:min-w-[140px]">
                  <Select value={filters.educator} onValueChange={(value) => updateFilter('educator', value)}>
                    <SelectTrigger className="w-full h-10 px-3 text-sm font-medium bg-background/80 backdrop-blur-sm border border-border/60 rounded-lg hover:border-border transition-all duration-200 shadow-sm">
                      <SelectValue placeholder="All Educators" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-xl z-[100]">
                      <SelectItem value="all" className="cursor-pointer hover:bg-accent focus:bg-accent">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>All Educators</span>
                        </div>
                      </SelectItem>
                      {educatorOptions.map(educator => (
                        <SelectItem 
                          key={educator.id} 
                          value={educator.id}
                          className="cursor-pointer hover:bg-accent focus:bg-accent"
                        >
                          {educator.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
