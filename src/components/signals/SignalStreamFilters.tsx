
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
import { useSignalTheme } from '@/hooks/useSignalTheme';

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
  const { colors } = useSignalTheme();
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
        <div 
          className="mb-4 p-3 rounded-2xl border"
          style={{
            background: colors.bg.glass,
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            borderColor: colors.border.default,
          }}
          data-prevent-widget-open="true"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
        >
          {/* SINGLE ROW: Search + Filter Icons + Create */}
          <div className="flex items-center gap-2">
            {/* Search (flex-1) */}
            <div className="flex-1 relative min-w-0">
                <Search 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none" 
                  style={{ color: colors.text.tertiary }}
                />
                
            <Input
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search"
              className="h-9 pl-9 pr-3 text-sm rounded-xl border transition-all duration-200"
              style={{
                background: colors.bg.surface,
                borderColor: colors.border.default,
                color: colors.text.primary,
              }}
            />
          </div>
          
          {/* Status Filter Icon */}
          <MobileFilterButton
            icon={<Filter className="w-4 h-4" />}
            label="Status"
            isActive={filters.status !== 'all' && filters.status !== ''}
            onClick={() => setMobileSheetOpen('status')}
          />
          
          {/* Trade Type Filter Icon */}
          <MobileFilterButton
            icon={<TrendingUp className="w-4 h-4" />}
            label="Type"
            isActive={filters.tradeType !== 'all' && filters.tradeType !== ''}
            onClick={() => setMobileSheetOpen('tradeType')}
          />
          
          {/* Educator Filter Icon */}
          {educatorOptions.length > 1 && (
            <MobileFilterButton
              icon={<Users className="w-4 h-4" />}
              label="Educator"
              isActive={filters.educator !== 'all' && filters.educator !== ''}
              onClick={() => setMobileSheetOpen('educator')}
            />
          )}
          
          {/* Create Signal Button */}
          {canCreateSignals && (
            <GlassmorphismCreateButton onClick={handleCreateSignalClick} />
          )}
          
          {/* Clear All (icon only if active) */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAllClick}
              className="h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{
                background: colors.state.danger,
                border: `1px solid ${colors.border.danger}`,
                color: colors.accent.danger,
              }}
              aria-label="Clear all filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        </div>

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
    <>
      <Card 
        className="mb-6 rounded-2xl border border-border/40 hover:border-lightGreenHover dark:hover:border-primary/30 transition-all duration-300"
        style={{
          background: 'rgba(18, 18, 20, 0.95)',
          backdropFilter: 'blur(20px) saturate(120%)',
          WebkitBackdropFilter: 'blur(20px) saturate(120%)',
        }}
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 z-10 pointer-events-none" style={{ color: colors.text.tertiary }} />
              
              <Input
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search xeon alerts"
                className="h-10 pl-10 pr-3 text-sm rounded-xl border transition-all duration-200"
                style={{
                  background: colors.bg.surface,
                  borderColor: colors.border.default,
                  color: colors.text.primary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.border.active;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border.default;
                }}
              />
            </div>
          </div>

          {/* Filters Section - Icon buttons matching mobile */}
          <div className="flex items-center gap-3">
            {/* Status Filter Icon */}
            <MobileFilterButton
              icon={<Filter className="w-4 h-4" />}
              label="Status"
              isActive={filters.status !== 'all' && filters.status !== ''}
              onClick={() => setMobileSheetOpen('status')}
            />
            
            {/* Trade Type Filter Icon */}
            <MobileFilterButton
              icon={<TrendingUp className="w-4 h-4" />}
              label="Type"
              isActive={filters.tradeType !== 'all' && filters.tradeType !== ''}
              onClick={() => setMobileSheetOpen('tradeType')}
            />
            
            {/* Educator Filter Icon */}
            {educatorOptions.length > 1 && (
              <MobileFilterButton
                icon={<Users className="w-4 h-4" />}
                label="Educator"
                isActive={filters.educator !== 'all' && filters.educator !== ''}
                onClick={() => setMobileSheetOpen('educator')}
              />
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 ml-auto">
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
      
      {/* Desktop Filter Sheets */}
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
