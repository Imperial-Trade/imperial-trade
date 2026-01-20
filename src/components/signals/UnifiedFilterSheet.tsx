import React, { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Filter, TrendingUp, Users, Check, CheckCircle, TrendingDown } from "lucide-react";
import { useSignalTheme } from "@/hooks/useSignalTheme";
import { cn } from "@/lib/utils";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import type { SlideDirection } from "@/hooks/useSheetNavigation";

interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
  selectedEducators: string[];
}

interface UnifiedFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  statusOptions: Array<{ value: string; label: string; icon?: any }>;
  tradeTypeOptions: Array<{ value: string; label: string; icon?: any }>;
  educatorOptions: Array<{ id: string; name: string }>;
  slideDirection?: SlideDirection;
  filterType?: 'status' | 'tradeType' | 'educator';
}

type TabType = 'status' | 'tradeType' | 'educator';

export function UnifiedFilterSheet({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  statusOptions,
  tradeTypeOptions,
  educatorOptions,
  slideDirection,
  filterType = 'status'
}: UnifiedFilterSheetProps) {
  const { colors, isDark } = useSignalTheme();
  const { isMobile } = useDeviceDetection();
  
  // On mobile, use tabs; on desktop/tablet, use filterType prop directly
  const [mobileActiveTab, setMobileActiveTab] = useState<'status' | 'tradeType' | 'educator'>(filterType);
  
  // Sync mobileActiveTab when filterType changes (from parent)
  useEffect(() => {
    setMobileActiveTab(filterType);
  }, [filterType]);
  
  // Use mobileActiveTab on mobile, filterType on desktop
  const activeFilter = isMobile ? mobileActiveTab : filterType;
  
  // Get animation class based on slide direction
  const getSlideAnimationClass = () => {
    if (!slideDirection || isMobile) return '';
    switch (slideDirection) {
      case 'left': return 'sheet-slide-in-left';
      case 'right': return 'sheet-slide-in-right';
      default: return '';
    }
  };
  
  // Calculate active filter count
  const activeFilterCount = [
    filters.status !== 'all' && filters.status !== '',
    filters.tradeType !== 'all' && filters.tradeType !== '',
    filters.educator !== 'all' && filters.educator !== '',
  ].filter(Boolean).length;

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };


  const renderStatusOptions = () => {
    return statusOptions.map((option) => {
      const isActive = filters.status === option.value;
      
      return (
        <button
          key={option.value}
          onClick={() => {
            updateFilter('status', option.value);
          }}
          className={cn(
            "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all duration-200",
            !isActive && "hover:bg-white/5"
          )}
          style={isActive ? {
            background: colors.state.active,
            borderLeft: `3px solid ${colors.accent.primary}`,
            paddingLeft: 'calc(1rem - 3px)',
          } : {
            background: 'transparent',
          }}
        >
          {option.icon && (
            <span className="w-5 h-5 flex items-center justify-center">
              {React.createElement(option.icon, { 
                className: "w-5 h-5",
                style: { color: isActive ? colors.accent.primary : colors.text.tertiary }
              })}
            </span>
          )}
          <span className="flex-1 text-left font-medium" style={{ color: isActive ? colors.text.accent : colors.text.primary }}>
            {option.label}
          </span>
          {isActive && <Check className="w-5 h-5" style={{ color: colors.accent.primary }} />}
        </button>
      );
    });
  };

  const renderTradeTypeOptions = () => {
    return tradeTypeOptions.map((option) => {
      const isActive = filters.tradeType === option.value;
      const activeColor = colors.accent.green;
      
      return (
        <button
          key={option.value}
          onClick={() => {
            updateFilter('tradeType', option.value);
          }}
          className={cn(
            "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all duration-200",
            !isActive && "hover:bg-white/5"
          )}
          style={isActive ? {
            background: colors.semantic.success,
            borderLeft: `3px solid ${activeColor}`,
            paddingLeft: 'calc(1rem - 3px)',
          } : {
            background: 'transparent',
          }}
        >
          {option.icon && (
            <span className="w-5 h-5 flex items-center justify-center">
              {React.createElement(option.icon, { 
                className: "w-5 h-5",
                style: { color: isActive ? activeColor : colors.text.tertiary }
              })}
            </span>
          )}
          <span className="flex-1 text-left font-medium" style={{ color: isActive ? activeColor : colors.text.primary }}>
            {option.label}
          </span>
          {isActive && <Check className="w-5 h-5" style={{ color: activeColor }} />}
        </button>
      );
    });
  };

  const renderEducatorOptions = () => {
    const allEducatorIds = educatorOptions.map(e => e.id);
    const isAllSelected = filters.selectedEducators.length === allEducatorIds.length && filters.selectedEducators.length > 0;
    
    const toggleAllEducators = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isAllSelected) {
        onFiltersChange({
          ...filters,
          selectedEducators: [],
          educator: 'all'
        });
      } else {
        onFiltersChange({
          ...filters,
          selectedEducators: allEducatorIds,
          educator: 'all'
        });
      }
    };
    
    const toggleEducator = (e: React.MouseEvent, educatorId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const isSelected = filters.selectedEducators.includes(educatorId);
      let newSelectedEducators: string[];
      
      if (isSelected) {
        newSelectedEducators = filters.selectedEducators.filter(id => id !== educatorId);
      } else {
        newSelectedEducators = [...filters.selectedEducators, educatorId];
      }
      
      onFiltersChange({
        ...filters,
        selectedEducators: newSelectedEducators,
        educator: newSelectedEducators.length === 0 ? 'all' : 
                 newSelectedEducators.length === allEducatorIds.length ? 'all' : 
                 newSelectedEducators[0]
      });
    };
    
    return (
      <>
        {/* All Educators Checkbox */}
        <button
          type="button"
          onClick={toggleAllEducators}
          className={cn(
            "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all duration-200 touch-manipulation",
            !isAllSelected && "hover:bg-white/5 active:bg-white/10"
          )}
          style={isAllSelected ? {
            background: colors.state.active,
            borderLeft: `3px solid ${colors.accent.primary}`,
            paddingLeft: 'calc(1rem - 3px)',
          } : {
            background: 'transparent',
          }}
        >
          <div 
            className="w-6 h-6 rounded flex items-center justify-center border-2 transition-all flex-shrink-0"
            style={{
              borderColor: isAllSelected ? colors.accent.primary : colors.border.default,
              background: isAllSelected ? colors.accent.primary : 'transparent',
            }}
          >
            {isAllSelected && <Check className="w-4 h-4 text-white" />}
          </div>
          <Users className="w-5 h-5 flex-shrink-0" style={{ color: isAllSelected ? colors.accent.primary : colors.text.tertiary }} />
          <span className="flex-1 text-left font-medium text-sm md:text-base" style={{ color: isAllSelected ? colors.text.accent : colors.text.primary }}>
            All Educators
          </span>
        </button>
        
        {/* Individual Educator Checkboxes */}
        {educatorOptions.map((educator) => {
          const isSelected = filters.selectedEducators.includes(educator.id);
          return (
            <button
              key={educator.id}
              type="button"
              onClick={(e) => toggleEducator(e, educator.id)}
              className={cn(
                "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all duration-200 touch-manipulation",
                !isSelected && "hover:bg-white/5 active:bg-white/10"
              )}
              style={isSelected ? {
                background: colors.state.active,
                borderLeft: `3px solid ${colors.accent.primary}`,
                paddingLeft: 'calc(1rem - 3px)',
              } : {
                background: 'transparent',
              }}
            >
              <div 
                className="w-6 h-6 rounded flex items-center justify-center border-2 transition-all flex-shrink-0"
                style={{
                  borderColor: isSelected ? colors.accent.primary : colors.border.default,
                  background: isSelected ? colors.accent.primary : 'transparent',
                }}
              >
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </div>
              <Users className="w-5 h-5 flex-shrink-0" style={{ color: isSelected ? colors.accent.primary : colors.text.tertiary }} />
              <span className="flex-1 text-left font-medium text-sm md:text-base" style={{ color: isSelected ? colors.text.accent : colors.text.primary }}>
                {educator.name}
              </span>
            </button>
          );
        })}
      </>
    );
  };

  const renderContent = () => {
    switch (activeFilter) {
      case 'status':
        return renderStatusOptions();
      case 'tradeType':
        return renderTradeTypeOptions();
      case 'educator':
        return renderEducatorOptions();
      default:
        return null;
    }
  };

  // Get filter header info
  const getFilterHeader = () => {
    switch (activeFilter) {
      case 'status':
        return { icon: Filter, label: 'Status' };
      case 'tradeType':
        return { icon: TrendingUp, label: 'Types' };
      case 'educator':
        return { icon: Users, label: 'Educator' };
      default:
        return { icon: Filter, label: 'Filter' };
    }
  };

  const filterHeader = getFilterHeader();

  // Tabs for mobile view
  const tabs = [
    { type: 'status' as const, label: 'Status', icon: Filter },
    { type: 'tradeType' as const, label: 'Types', icon: TrendingUp },
    ...(educatorOptions.length > 1 ? [{ type: 'educator' as const, label: 'Educator', icon: Users }] : [])
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={isMobile ? "bottom-mobile" : "right"}
        className={cn(
          "w-full border-border/50 [&>button]:hidden flex flex-col",
          isMobile ? "p-0" : "sm:max-w-md inset-y-0",
          getSlideAnimationClass()
        )}
        style={{
          background: isDark ? 'rgba(15, 15, 20, 0.95)' : '#FFFFFF',
          backdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
          WebkitBackdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
          paddingTop: isMobile ? 0 : 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 'max(env(safe-area-inset-bottom, 0px), 12px)',
        }}
      >
        {/* Drag Handle Indicator - Instagram style (mobile only) */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-400/50 rounded-full" />
          </div>
        )}
        
        <div 
          className={cn("flex flex-col h-full overflow-hidden", isMobile ? "px-4" : "")}
          style={{
            background: isDark ? 'rgba(15, 15, 20, 0.95)' : '#FFFFFF',
          }}
        >
        
        {/* Mobile: Show "Filters" header + Tabs */}
        {isMobile ? (
          <>
            {/* Filters Header */}
            <div className="px-2 pt-2 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5" style={{ color: '#6B8AFF' }} />
                <span className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                  Filters
                </span>
              </div>
            </div>
            
            {/* Tab Buttons */}
            <div className="flex gap-2 px-2 pb-4">
              {tabs.map((tab) => {
                const isActive = mobileActiveTab === tab.type;
                const Icon = tab.icon;
                
                return (
                  <button
                    key={tab.type}
                    onClick={() => setMobileActiveTab(tab.type)}
                    className={cn(
                      "flex-1 h-12 px-4 flex items-center justify-center gap-2 rounded-xl transition-all duration-200",
                      "text-sm font-medium"
                    )}
                    style={isActive ? {
                      background: 'rgba(107, 138, 255, 0.15)',
                      color: '#6B8AFF',
                      border: '1px solid rgba(107, 138, 255, 0.5)',
                    } : {
                      background: colors.bg.surface,
                      color: colors.text.secondary,
                      border: `1px solid ${colors.border.default}`,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* Desktop/Tablet: Show simple title header */
          <div 
            className="px-6 pt-4 pb-4 border-b border-border/50 sticky top-0 z-10"
            style={{
              background: isDark ? 'rgba(15, 15, 20, 0.95)' : '#FFFFFF',
              backdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
              WebkitBackdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
            }}
          >
            <div className="flex items-center gap-3">
              {React.createElement(filterHeader.icon, { className: "w-5 h-5", style: { color: '#D4AF37' } })}
              <span className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                {filterHeader.label}
              </span>
            </div>
          </div>
        )}
        
        <div className={cn("flex-1 overflow-y-auto", isMobile ? "pb-4" : "mt-4")}>
          <div className="pr-4 space-y-2">
            {renderContent()}
          </div>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
