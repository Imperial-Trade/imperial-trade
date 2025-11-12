import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X, TrendingUp, TrendingDown, Clock, CheckCircle, Users, Plus, Bell } from 'lucide-react';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { MobileFilterButton } from './MobileFilterButton';
import { MobileFilterSheet } from './MobileFilterSheet';
import { UnifiedFilterSheet } from './UnifiedFilterSheet';
import { GlassmorphismCreateButton } from './GlassmorphismCreateButton';
import { useSignalTheme } from '@/hooks/useSignalTheme';
import { SignalStreamBottomNav } from './SignalStreamBottomNav';
import { SignalSearchSheet } from './SignalSearchSheet';
import { NotificationSheet } from './NotificationSheet';
interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
  selectedEducators: string[]; // Array of selected educator IDs
}
interface SignalStreamFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  educatorOptions: Array<{
    id: string;
    name: string;
  }>;
  signalCounts: {
    total: number;
    active: number;
    closed: number;
    buy: number; // Combined buy + buy_limit
    sell: number; // Combined sell + sell_limit
  };
  canCreateSignals?: boolean;
  onCreateSignal?: () => void;
  unreadNotifications?: number;
  onBellClick?: () => void;
}
export function SignalStreamFilters({
  filters,
  onFiltersChange,
  educatorOptions,
  signalCounts,
  canCreateSignals,
  onCreateSignal,
  unreadNotifications = 0,
  onBellClick
}: SignalStreamFiltersProps) {
  const {
    isMobile
  } = useDeviceDetection();
  const {
    colors
  } = useSignalTheme();
  const [activeSheet, setActiveSheet] = useState<'search' | 'filters' | 'status' | 'tradeType' | 'educator' | 'notifications' | null>(null);
  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };
  const clearFilter = (key: keyof FilterState) => {
    onFiltersChange({
      ...filters,
      [key]: ''
    });
  };
  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      tradeType: 'all',
      educator: 'all',
      selectedEducators: []
    });
  };
  const hasActiveFilters = filters.search !== '' || filters.status !== '' && filters.status !== 'all' || filters.tradeType !== '' && filters.tradeType !== 'all' || filters.educator !== '' && filters.educator !== 'all';
  const statusOptions = [{
    value: 'all',
    label: 'All Status',
    icon: Filter
  }, {
    value: 'active',
    label: 'Active',
    icon: Clock
  }, {
    value: 'closed',
    label: 'Closed',
    icon: CheckCircle
  }];
  const tradeTypeOptions = [{
    value: 'all',
    label: 'All Types',
    icon: Filter
  }, {
    value: 'buy',
    label: 'Buy Orders',
    icon: TrendingUp
  }, {
    value: 'sell',
    label: 'Sell Orders',
    icon: TrendingDown
  }];

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
    return <>
        {/* Bottom Navigation Bar */}
        <SignalStreamBottomNav 
          filters={filters} 
          onOpenSheet={setActiveSheet} 
          educatorOptions={educatorOptions}
          unreadNotifications={unreadNotifications}
          onBellClick={onBellClick}
          canCreateSignals={canCreateSignals}
          onCreateClick={handleCreateSignalClick}
        />

        {/* Search Sheet */}
        <SignalSearchSheet 
          isOpen={activeSheet === 'search'} 
          onClose={() => setActiveSheet(null)} 
          searchValue={filters.search} 
          onSearchChange={value => updateFilter('search', value)} 
        />

        {/* Unified Filter Sheet */}
        <UnifiedFilterSheet 
          isOpen={activeSheet === 'filters'} 
          onClose={() => setActiveSheet(null)} 
          filters={filters}
          onFiltersChange={onFiltersChange}
          statusOptions={statusOptions}
          tradeTypeOptions={tradeTypeOptions}
          educatorOptions={educatorOptions}
        />

        {/* Notification Sheet */}
        <NotificationSheet 
          isOpen={activeSheet === 'notifications'} 
          onClose={() => setActiveSheet(null)} 
        />
      </>;
  }

  // Desktop Layout (>= 768px)
  return <>
      <Card className="mb-6 rounded-2xl border border-border/40 hover:border-lightGreenHover dark:hover:border-primary/30 transition-all duration-300" style={{
      background: 'rgba(18, 18, 20, 0.95)',
      backdropFilter: 'blur(20px) saturate(120%)',
      WebkitBackdropFilter: 'blur(20px) saturate(120%)'
    }} data-prevent-widget-open="true" onPointerDown={e => e.stopPropagation()} onPointerMove={e => e.stopPropagation()}>
      <CardContent className="p-4 space-y-4 mx-0">
        {/* Enhanced Uniform Layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* Search Section - Consistent sizing */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 z-10 pointer-events-none" style={{
                color: colors.text.tertiary
              }} />
              
              <Input value={filters.search} onChange={e => updateFilter('search', e.target.value)} placeholder="Search xeon alerts" className="h-10 pl-10 pr-3 text-sm rounded-xl border transition-all duration-200" style={{
                background: colors.bg.surface,
                borderColor: colors.border.default,
                color: colors.text.primary
              }} onFocus={e => {
                e.currentTarget.style.borderColor = colors.border.active;
              }} onBlur={e => {
                e.currentTarget.style.borderColor = colors.border.default;
              }} />
            </div>
          </div>

          {/* Filters Section - Icon buttons matching mobile */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              onClick={() => setActiveSheet('notifications')}
              className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 relative"
              style={{
                background: colors.bg.surface,
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                border: `1px solid ${colors.border.default}`,
                color: colors.text.secondary
              }}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center animate-bounce bg-red-500 border-2 border-background"
                >
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Badge>
              )}
            </button>

            {/* Status Filter Icon */}
            <MobileFilterButton icon={<Filter className="w-4 h-4" />} label="Status" isActive={filters.status !== 'all' && filters.status !== ''} onClick={() => setActiveSheet('status')} />
            
            {/* Trade Type Filter Icon */}
            <MobileFilterButton icon={<TrendingUp className="w-4 h-4" />} label="Type" isActive={filters.tradeType !== 'all' && filters.tradeType !== ''} onClick={() => setActiveSheet('tradeType')} />
            
            {/* Educator Filter Icon */}
            {educatorOptions.length > 1 && <MobileFilterButton icon={<Users className="w-4 h-4" />} label="Educator" isActive={filters.educator !== 'all' && filters.educator !== ''} onClick={() => setActiveSheet('educator')} />}
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 ml-auto">
              {hasActiveFilters && <button type="button" onClick={handleClearAllClick} className="h-9 px-4 rounded-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 min-w-[100px]" style={{
                background: colors.bg.surface,
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                border: `1px solid ${colors.border.default}`,
                color: colors.text.secondary
              }}>
                  <X className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Clear All</span>
                </button>}
              
               {canCreateSignals && <button type="button" onClick={handleCreateSignalClick} className="h-9 px-4 rounded-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 min-w-[120px]" style={{
                background: colors.state.ctaGradient,
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                border: `1px solid ${colors.border.active}`
              }}>
                  <Plus className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="text-sm font-bold text-white">Create Alert</span>
                </button>}
            </div>
          </div>
        </div>

      </CardContent>
      </Card>
      
      {/* Desktop Filter Sheets */}
      <MobileFilterSheet type="status" isOpen={activeSheet === 'status'} onClose={() => setActiveSheet(null)} currentValue={filters.status} onValueChange={value => {
      updateFilter('status', value);
      setActiveSheet(null);
    }} options={statusOptions} />

      <MobileFilterSheet type="tradeType" isOpen={activeSheet === 'tradeType'} onClose={() => setActiveSheet(null)} currentValue={filters.tradeType} onValueChange={value => {
      updateFilter('tradeType', value);
      setActiveSheet(null);
    }} options={tradeTypeOptions} />

      {educatorOptions.length > 1 && <MobileFilterSheet type="educator" isOpen={activeSheet === 'educator'} onClose={() => setActiveSheet(null)} currentValue={filters.educator} onValueChange={value => {
      updateFilter('educator', value);
      setActiveSheet(null);
    }} educatorOptions={educatorOptions} selectedEducators={filters.selectedEducators || []} onEducatorsChange={educators => {
      onFiltersChange({
        ...filters,
        selectedEducators: educators
      });
      if (educators.length === 0) {
        updateFilter('educator', 'all');
      } else if (educators.length === educatorOptions.length) {
        updateFilter('educator', 'all');
      } else {
        updateFilter('educator', educators[0] || 'all');
      }
    }} />}

    {/* Notification Sheet */}
    <NotificationSheet 
      isOpen={activeSheet === 'notifications'} 
      onClose={() => setActiveSheet(null)} 
    />
    </>;
}