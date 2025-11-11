import React, { useState } from "react";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose
} from "@/components/ui/drawer";
import { Filter, TrendingUp, Users, Check, X, Clock, CheckCircle, TrendingDown } from "lucide-react";
import { useSignalTheme } from "@/hooks/useSignalTheme";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
}

type TabType = 'status' | 'tradeType' | 'educator';

export function UnifiedFilterSheet({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  statusOptions,
  tradeTypeOptions,
  educatorOptions
}: UnifiedFilterSheetProps) {
  const { colors } = useSignalTheme();
  const [activeTab, setActiveTab] = useState<TabType>('status');
  
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

  const tabs = [
    { type: 'status' as TabType, label: 'Status', icon: Filter },
    { type: 'tradeType' as TabType, label: 'Types', icon: TrendingUp },
    ...(educatorOptions.length > 1 ? [{ type: 'educator' as TabType, label: 'Educator', icon: Users }] : [])
  ];

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
    const isAllSelected = filters.selectedEducators.length === allEducatorIds.length;
    
    const toggleAllEducators = () => {
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
    
    const toggleEducator = (educatorId: string) => {
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
          onClick={toggleAllEducators}
          className={cn(
            "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all duration-200",
            !isAllSelected && "hover:bg-white/5"
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
            className="w-5 h-5 rounded flex items-center justify-center border-2 transition-all"
            style={{
              borderColor: isAllSelected ? colors.accent.primary : colors.border.default,
              background: isAllSelected ? colors.accent.primary : 'transparent',
            }}
          >
            {isAllSelected && <Check className="w-3 h-3 text-white" />}
          </div>
          <Users className="w-5 h-5" style={{ color: isAllSelected ? colors.accent.primary : colors.text.tertiary }} />
          <span className="flex-1 text-left font-medium" style={{ color: isAllSelected ? colors.text.accent : colors.text.primary }}>
            All Educators
          </span>
        </button>
        
        {/* Individual Educator Checkboxes */}
        {educatorOptions.map((educator) => {
          const isSelected = filters.selectedEducators.includes(educator.id);
          return (
            <button
              key={educator.id}
              onClick={() => toggleEducator(educator.id)}
              className={cn(
                "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all duration-200",
                !isSelected && "hover:bg-white/5"
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
                className="w-5 h-5 rounded flex items-center justify-center border-2 transition-all"
                style={{
                  borderColor: isSelected ? colors.accent.primary : colors.border.default,
                  background: isSelected ? colors.accent.primary : 'transparent',
                }}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <Users className="w-5 h-5" style={{ color: isSelected ? colors.accent.primary : colors.text.tertiary }} />
              <span className="flex-1 text-left font-medium" style={{ color: isSelected ? colors.text.accent : colors.text.primary }}>
                {educator.name}
              </span>
            </button>
          );
        })}
      </>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
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

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent 
        className="max-h-[75vh] rounded-t-3xl z-[110]"
        style={{
          background: colors.bg.glass,
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderTop: `2px solid ${colors.border.default}`,
          boxShadow: `0 -10px 40px rgba(0, 0, 0, 0.3)`,
        }}
      >
        <DrawerHeader style={{ borderBottom: `1px solid ${colors.border.default}` }} className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5" style={{ color: colors.text.accent }} />
              <DrawerTitle style={{ color: colors.text.primary }}>
                Filters
                {activeFilterCount > 0 && (
                  <Badge 
                    className="ml-2 h-5 px-2 text-xs"
                    style={{
                      background: colors.accent.primary,
                      color: 'white'
                    }}
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </DrawerTitle>
            </div>
            <DrawerClose asChild>
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
                style={{
                  background: colors.bg.surface,
                  color: colors.text.secondary,
                }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </DrawerClose>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.type;
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.type}
                  onClick={() => setActiveTab(tab.type)}
                  className={cn(
                    "flex-1 h-10 px-4 flex items-center justify-center gap-2 rounded-lg transition-all duration-200",
                    "text-sm font-medium"
                  )}
                  style={isActive ? {
                    background: colors.state.active,
                    color: colors.text.accent,
                    border: `1px solid ${colors.border.active}`,
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
        </DrawerHeader>
        
        <div className="p-4 space-y-2 overflow-y-auto">
          {renderContent()}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
