import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { SignalSearchSheet } from './SignalSearchSheet';
import { NotificationSheet } from './NotificationSheet';
import { useSheetNavigation, SheetType, SlideDirection } from '@/hooks/useSheetNavigation';
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
  onNotificationSettingsClick?: () => void;
  onClearUnread?: () => void;
  onShowPrompt?: () => void;
  onOpenFilterSheet?: (type: 'status' | 'tradeType' | 'educator') => void;
}
export function SignalStreamFilters({
  filters,
  onFiltersChange,
  educatorOptions,
  signalCounts,
  canCreateSignals,
  onCreateSignal,
  unreadNotifications = 0,
  onBellClick,
  onNotificationSettingsClick,
  onClearUnread,
  onShowPrompt,
  onOpenFilterSheet
}: SignalStreamFiltersProps) {
  const {
    isMobile
  } = useDeviceDetection();
  const {
    colors
  } = useSignalTheme();
  
  // Use the new sheet navigation hook for toggle behavior and slide directions
  const {
    activeSheet: navActiveSheet,
    slideDirection,
    isTransitioning,
    toggleSheet,
    closeSheet
  } = useSheetNavigation();
  
  // Track which specific filter type is open - use ref for immediate updates
  const activeFilterTypeRef = useRef<'status' | 'tradeType' | 'educator'>('status');
  const [activeFilterType, setActiveFilterType] = useState<'status' | 'tradeType' | 'educator'>('status');
  
  // Convert legacy sheet types to new SheetType
  const activeSheet = navActiveSheet as SheetType | 'filters' | 'status' | 'tradeType' | 'educator' | null;
  
  // Handle opening sheets with proper navigation
  const handleOpenSheet = useCallback((type: 'search' | 'filters' | 'status' | 'tradeType' | 'educator' | 'notifications') => {
    // Map legacy types to SheetType
    const sheetTypeMap: Record<string, SheetType> = {
      'recent': 'recent',
      'search': 'search',
      'filter': 'filter',
      'filters': 'filter',
      'status': 'filter',
      'tradeType': 'filter',
      'educator': 'filter',
      'alerts': 'alerts',
      'notifications': 'recent'
    };
    
    const mappedType = sheetTypeMap[type] || type as SheetType;
    toggleSheet(mappedType);
  }, [toggleSheet]);
  
  // Helper to open filter sheet with specific type
  const openFilterWithType = useCallback((type: 'status' | 'tradeType' | 'educator') => {
    activeFilterTypeRef.current = type;
    setActiveFilterType(type);
    toggleSheet('filter');
  }, [toggleSheet]);
  
  // Expose filter sheet opening to parent via callback
  useEffect(() => {
    // Create a wrapper that uses our internal toggleSheet
    const openSheet = (type: 'status' | 'tradeType' | 'educator') => {
      activeFilterTypeRef.current = type;
      setActiveFilterType(type);
      toggleSheet('filter');
    };
    // Store it for external access
    (window as any).__signalStreamOpenFilterSheet = openSheet;
    
    // Expose notification sheet opening
    const openNotificationSheet = () => {
      toggleSheet('recent');
    };
    (window as any).__signalStreamOpenNotificationSheet = openNotificationSheet;
    
    return () => {
      delete (window as any).__signalStreamOpenFilterSheet;
      delete (window as any).__signalStreamOpenNotificationSheet;
    };
  }, [toggleSheet]);
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

        {/* Search Sheet */}
        <SignalSearchSheet 
          isOpen={navActiveSheet === 'search'} 
          onClose={closeSheet} 
          searchValue={filters.search} 
          onSearchChange={value => updateFilter('search', value)}
          slideDirection={slideDirection}
        />

        {/* Unified Filter Sheet */}
        <UnifiedFilterSheet 
          isOpen={navActiveSheet === 'filter'} 
          onClose={closeSheet} 
          filters={filters}
          onFiltersChange={onFiltersChange}
          statusOptions={statusOptions}
          tradeTypeOptions={tradeTypeOptions}
          educatorOptions={educatorOptions}
          key={`filter-${activeFilterType}`}
          filterType={activeFilterType}
          slideDirection={slideDirection}
        />

        {/* Notification Sheet (Recent) */}
        <NotificationSheet 
          isOpen={navActiveSheet === 'recent'} 
          onClose={closeSheet}
          unreadNotifications={unreadNotifications}
          onClearUnread={onClearUnread}
          onShowPrompt={onShowPrompt}
          filters={filters}
          statusOptions={statusOptions}
          tradeTypeOptions={tradeTypeOptions}
          educatorOptions={educatorOptions}
          canCreateSignals={canCreateSignals}
          onCreateSignal={handleCreateSignalClick}
          onOpenFilterSheet={(type) => toggleSheet('filter')}
          onOpenNotificationSettings={onNotificationSettingsClick}
          slideDirection={slideDirection}
        />

        {/* Alerts Sheet (Notification Settings) */}
        {/* Note: Alerts uses the ProviderNotificationSettingsModal which is handled by parent */}
      </>;
  }

  // Desktop Layout (>= 768px)
  return <>
      <Card className="mb-6 rounded-2xl transition-all duration-300 relative" style={{
      background: 'rgba(15, 15, 20, 0.3)',
      backdropFilter: 'blur(30px) saturate(180%)',
      WebkitBackdropFilter: 'blur(30px) saturate(180%)',
      border: 'none',
      boxShadow: 'none',
      position: 'relative',
      zIndex: 1
    }} data-prevent-widget-open="true" onPointerDown={e => e.stopPropagation()} onPointerMove={e => e.stopPropagation()}>
      <CardContent className="p-4 space-y-4 mx-0">
        {/* Enhanced Uniform Layout */}
        <div className="flex flex-col md:flex-row gap-4">
          
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
            {/* Status Filter Icon */}
            <MobileFilterButton icon={<Filter className="w-4 h-4" />} label="Status" isActive={filters.status !== 'all' && filters.status !== ''} onClick={() => openFilterWithType('status')} />
            
            {/* Trade Type Filter Icon */}
            <MobileFilterButton icon={<TrendingUp className="w-4 h-4" />} label="Type" isActive={filters.tradeType !== 'all' && filters.tradeType !== ''} onClick={() => openFilterWithType('tradeType')} />
            
            {/* Educator Filter Icon */}
            {educatorOptions.length > 1 && <MobileFilterButton icon={<Users className="w-4 h-4" />} label="Educator" isActive={filters.educator !== 'all' && filters.educator !== ''} onClick={() => openFilterWithType('educator')} />}
            
            {/* Recent Activity / Notification Button */}
            <button
              onClick={() => toggleSheet('recent')}
              className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 relative"
              style={{
                background: colors.bg.surface,
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                border: `1px solid ${navActiveSheet === 'recent' ? '#D4AF37' : colors.border.default}`,
                color: navActiveSheet === 'recent' ? '#D4AF37' : colors.text.secondary
              }}
            >
              <Clock className="w-4 h-4" />
            </button>
            
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
              
              {/* Notification Settings Bell Button */}
              <button
                type="button"
                onClick={onNotificationSettingsClick}
                className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 relative"
                style={{
                  background: colors.bg.surface,
                  backdropFilter: 'blur(20px) saturate(150%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                  border: `1px solid ${navActiveSheet === 'alerts' ? '#D4AF37' : colors.border.default}`,
                  color: navActiveSheet === 'alerts' ? '#D4AF37' : colors.text.secondary
                }}
              >
                <Bell className="w-4 h-4" />
              </button>
              
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
      
      {/* Desktop Filter Sheets - Now using unified filter sheet */}
      <UnifiedFilterSheet 
        isOpen={navActiveSheet === 'filter'} 
        onClose={closeSheet} 
        filters={filters}
        onFiltersChange={onFiltersChange}
        statusOptions={statusOptions}
        tradeTypeOptions={tradeTypeOptions}
        educatorOptions={educatorOptions}
        key={`filter-${activeFilterType}`}
          filterType={activeFilterType}
        slideDirection={slideDirection}
      />

    {/* Notification Sheet (Recent) */}
    <NotificationSheet 
      isOpen={navActiveSheet === 'recent'} 
      onClose={closeSheet}
      unreadNotifications={unreadNotifications}
      onClearUnread={onClearUnread}
      onShowPrompt={onShowPrompt}
      filters={filters}
      statusOptions={statusOptions}
      tradeTypeOptions={tradeTypeOptions}
      educatorOptions={educatorOptions}
      canCreateSignals={canCreateSignals}
      onCreateSignal={handleCreateSignalClick}
      onOpenFilterSheet={(type) => toggleSheet('filter')}
      onOpenNotificationSettings={onNotificationSettingsClick}
      slideDirection={slideDirection}
    />
    
    {/* Search Sheet for desktop */}
    <SignalSearchSheet 
      isOpen={navActiveSheet === 'search'} 
      onClose={closeSheet} 
      searchValue={filters.search} 
      onSearchChange={value => updateFilter('search', value)}
      slideDirection={slideDirection}
    />
    </>;
}