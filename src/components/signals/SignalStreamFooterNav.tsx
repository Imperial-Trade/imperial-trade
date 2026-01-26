import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, Clock, Bell, Plus, Search } from 'lucide-react';
import { useSignalTheme } from '@/hooks/useSignalTheme';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { Input } from '@/components/ui/input';

interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
  selectedEducators: string[];
}

interface SignalStreamFooterNavProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onOpenFilter: () => void;
  onOpenRecent: () => void;
  onOpenNotifications: () => void;
  onCreateAlert: () => void;
  educatorOptions: Array<{ id: string; name: string }>;
  canCreateSignals?: boolean;
}

export const SignalStreamFooterNav: React.FC<SignalStreamFooterNavProps> = ({
  filters,
  onFiltersChange,
  onOpenFilter,
  onOpenRecent,
  onOpenNotifications,
  onCreateAlert,
  educatorOptions,
  canCreateSignals = false,
}) => {
  // All hooks must be called unconditionally before any early returns
  const { colors, isDark, theme } = useSignalTheme();
  const { isMobile } = useDeviceDetection();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  const handleSearchBlur = () => {
    // Only collapse if search is empty
    if (!filters.search) {
      setIsSearchFocused(false);
    }
  };

  // Keep expanded if there's search text
  useEffect(() => {
    if (filters.search && !isSearchFocused) {
      setIsSearchFocused(true);
    }
  }, [filters.search, isSearchFocused]);

  // Memoize nav style to ensure it updates when theme changes
  const navStyle = useMemo(() => ({
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    background: isDark ? 'rgba(15, 15, 20, 0.3)' : 'rgba(255, 255, 255, 0.3)',
    border: 'none',
    boxShadow: 'none',
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: isMobile ? 'block' : 'none', // Hide instead of returning null
  }), [isDark, theme, isMobile]);

  const hasActiveFilters = 
    (filters.status !== 'all' && filters.status !== '') ||
    (filters.tradeType !== 'all' && filters.tradeType !== '') ||
    (filters.educator !== 'all' && filters.educator !== '');

  // Calculate active filter count for badge
  const activeFilterCount = [
    filters.status !== 'all' && filters.status !== '',
    filters.tradeType !== 'all' && filters.tradeType !== '',
    filters.educator !== 'all' && filters.educator !== '',
  ].filter(Boolean).length;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-[100] pb-safe"
      style={navStyle}
    >
      <div className="flex items-center gap-2 px-3 pt-0 pb-0 pb-safe" style={{ transform: 'translateY(8px)' }}>
        {/* Search Bar - Expands to full width when focused */}
        <div 
          className={`relative h-10 flex items-center transition-all duration-500 ease-in-out ${
            isSearchFocused 
              ? 'flex-1 min-w-0 w-full' 
              : 'flex-1 min-w-0'
          }`}
        >
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none transition-opacity duration-500"
            style={{ color: colors.text.tertiary }}
            strokeWidth={1}
          />
          <Input
            ref={searchInputRef}
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Search xeon alerts"
            className="h-10 pl-10 pr-3 text-sm rounded-xl border w-full py-0 flex items-center focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 transition-all duration-500"
            style={{
              background: colors.bg.surface,
              borderColor: isSearchFocused ? colors.border.active : colors.border.default,
              color: colors.text.primary,
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              paddingTop: 0,
              paddingBottom: 0,
              lineHeight: '40px',
            }}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
        </div>

        {/* Action Buttons - Hide when search is focused */}
        <div 
          className={`flex items-center gap-2 flex-shrink-0 transition-all duration-500 ease-in-out ${
            isSearchFocused 
              ? 'opacity-0 w-0 overflow-hidden pointer-events-none' 
              : 'opacity-100 w-auto pointer-events-auto'
          }`}
        >
          {/* Filter Button - Opens unified filter sheet */}
          <button
            onClick={onOpenFilter}
            className="h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 relative flex-shrink-0"
            style={{
              background: hasActiveFilters 
                ? colors.state.active 
                : colors.bg.surface,
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              border: `1px solid ${
                hasActiveFilters 
                  ? colors.accent.primary 
                  : colors.border.default
              }`,
              color: hasActiveFilters 
                ? colors.accent.primary 
                : colors.text.secondary
            }}
            title="Filters"
          >
            <Filter className="w-4 h-4" strokeWidth={1} />
            {activeFilterCount > 0 && (
              <span 
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: colors.accent.primary,
                  color: 'white'
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Recent/Clock Button */}
          <button
            onClick={onOpenRecent}
            className="h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 relative flex-shrink-0"
            style={{
              background: colors.bg.surface,
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              border: `1px solid ${colors.border.default}`,
              color: colors.text.secondary
            }}
            title="Recent Activity"
          >
            <Clock className="w-4 h-4" strokeWidth={1} />
          </button>

          {/* Notifications/Bell Button */}
          <button
            onClick={onOpenNotifications}
            className="h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 relative flex-shrink-0"
            style={{
              background: colors.bg.surface,
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              border: `1px solid ${colors.border.default}`,
              color: colors.text.secondary
            }}
            title="Notification Settings"
          >
            <Bell className="w-4 h-4" strokeWidth={1} />
          </button>

          {/* Create Alert Button */}
          {canCreateSignals && (
            <button
              onClick={onCreateAlert}
              className="h-10 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 ease-out hover:scale-105 active:scale-95 flex-shrink-0"
              style={{
                background: colors.state.ctaGradient,
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                border: `1px solid ${colors.border.active}`
              }}
              title="Create Alert"
            >
              <Plus className="w-4 h-4 text-white" strokeWidth={1} />
              <span className="text-xs font-bold text-white">Create</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

