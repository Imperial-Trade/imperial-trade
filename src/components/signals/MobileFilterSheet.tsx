import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, TrendingUp, Users, Check, X, Clock, Bell, Plus } from "lucide-react";
import { useSignalTheme } from "@/hooks/useSignalTheme";
import { cn } from "@/lib/utils";
import { MobileFilterButton } from "./MobileFilterButton";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
  selectedEducators: string[];
}

interface MobileFilterSheetProps {
  type: 'status' | 'tradeType' | 'educator';
  isOpen: boolean;
  onClose: () => void;
  currentValue: string;
  onValueChange: (value: string) => void;
  options?: Array<{ value: string; label: string; icon?: any }>;
  educatorOptions?: Array<{ id: string; name: string }>;
  selectedEducators?: string[];
  onEducatorsChange?: (educators: string[]) => void;
  filters?: FilterState;
  statusOptions?: Array<{ value: string; label: string; icon?: any }>;
  tradeTypeOptions?: Array<{ value: string; label: string; icon?: any }>;
  canCreateSignals?: boolean;
  onCreateSignal?: () => void;
  onOpenFilterSheet?: (type: 'status' | 'tradeType' | 'educator') => void;
  onOpenNotificationSheet?: () => void;
  onOpenNotificationSettings?: () => void;
}

export function MobileFilterSheet({
  type,
  isOpen,
  onClose,
  currentValue,
  onValueChange,
  options = [],
  educatorOptions = [],
  selectedEducators = [],
  onEducatorsChange,
  filters,
  statusOptions = [],
  tradeTypeOptions = [],
  canCreateSignals = false,
  onCreateSignal,
  onOpenFilterSheet,
  onOpenNotificationSheet,
  onOpenNotificationSettings
}: MobileFilterSheetProps) {
  const { colors } = useSignalTheme();
  const { isMobile } = useDeviceDetection();
  
  const getTitle = () => {
    switch (type) {
      case 'status':
        return 'Filter by Status';
      case 'tradeType':
        return 'Filter by Type';
      case 'educator':
        return 'Filter by Educator';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'status':
        return <Filter className="w-5 h-5" />;
      case 'tradeType':
        return <TrendingUp className="w-5 h-5" />;
      case 'educator':
        return <Users className="w-5 h-5" />;
    }
  };

  const renderOptions = () => {
    if (type === 'educator' && educatorOptions.length > 0 && onEducatorsChange) {
      const allEducatorIds = educatorOptions.map(e => e.id);
      const isAllSelected = selectedEducators.length === allEducatorIds.length && selectedEducators.length > 0;
      
      const toggleAllEducators = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAllSelected) {
          onEducatorsChange([]);
        } else {
          onEducatorsChange(allEducatorIds);
        }
      };
      
      const toggleEducator = (e: React.MouseEvent, educatorId: string) => {
        e.preventDefault();
        e.stopPropagation();
        const isSelected = selectedEducators.includes(educatorId);
        if (isSelected) {
          onEducatorsChange(selectedEducators.filter(id => id !== educatorId));
        } else {
          onEducatorsChange([...selectedEducators, educatorId]);
        }
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
            const isSelected = selectedEducators.includes(educator.id);
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
    }

    return options.map((option) => {
      const isActive = currentValue === option.value;
      const activeColor = type === 'tradeType' ? colors.accent.green : colors.accent.primary;
      
      return (
        <button
          key={option.value}
          onClick={() => {
            onValueChange(option.value);
            onClose();
          }}
          className={cn(
            "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all duration-200",
            !isActive && "hover:bg-white/5"
          )}
          style={isActive ? {
            background: type === 'tradeType' ? colors.semantic.success : colors.state.active,
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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side={isMobile ? "bottom-mobile" : "right"}
        className={cn(
          "w-full bg-background/95 backdrop-blur-xl border-border/50 [&>button]:hidden flex flex-col",
          isMobile ? "p-0" : "sm:max-w-md inset-y-0"
        )}
        style={{
          paddingTop: isMobile ? 0 : 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: isMobile ? 'max(env(safe-area-inset-bottom, 0px), 12px)' : 'max(env(safe-area-inset-bottom, 0px), 12px)',
        }}
      >
        {/* Drag Handle Indicator - Instagram style */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-400/50 rounded-full" />
          </div>
        )}
        
        <div className={cn("flex flex-col h-full overflow-hidden", isMobile ? "px-4" : "")}>
        {/* Filter Buttons Section - Same as filter card (Desktop/Tablet only) */}
        {!isMobile && filters && onOpenFilterSheet && (
          <div className="px-6 pt-4 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              {/* Status Filter Icon */}
              {statusOptions.length > 0 && (
                <MobileFilterButton 
                  icon={<Filter className="w-4 h-4" />} 
                  label="Status" 
                  isActive={filters.status !== 'all' && filters.status !== ''} 
                  onClick={() => {
                    if (type !== 'status') {
                      onClose();
                      onOpenFilterSheet('status');
                    }
                  }} 
                />
              )}
              
              {/* Trade Type Filter Icon */}
              {tradeTypeOptions.length > 0 && (
                <MobileFilterButton 
                  icon={<TrendingUp className="w-4 h-4" />} 
                  label="Type" 
                  isActive={filters.tradeType !== 'all' && filters.tradeType !== ''} 
                  onClick={() => {
                    if (type !== 'tradeType') {
                      onClose();
                      onOpenFilterSheet('tradeType');
                    }
                  }} 
                />
              )}
              
              {/* Educator Filter Icon */}
              {educatorOptions.length > 1 && (
                <MobileFilterButton 
                  icon={<Users className="w-4 h-4" />} 
                  label="Educator" 
                  isActive={filters.educator !== 'all' && filters.educator !== ''} 
                  onClick={() => {
                    if (type !== 'educator') {
                      onClose();
                      onOpenFilterSheet('educator');
                    }
                  }} 
                />
              )}
              
              {/* Recent Activity Button */}
              {onOpenNotificationSheet && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenNotificationSheet();
                  }}
                  className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 relative"
                  style={{
                    background: colors.bg.surface,
                    backdropFilter: 'blur(20px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                    border: `1px solid ${colors.border.default}`,
                    color: colors.text.secondary
                  }}
                >
                  <Clock className="w-4 h-4" />
                </button>
              )}
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3 ml-auto">
                {/* Notification Settings Bell Button */}
                {onOpenNotificationSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenNotificationSettings();
                    }}
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
                  </button>
                )}
                
                {/* Create Alert Button */}
                {canCreateSignals && onCreateSignal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCreateSignal();
                    }}
                    className="h-9 px-3 rounded-xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95"
                    style={{
                      background: colors.state.ctaGradient,
                      backdropFilter: 'blur(20px) saturate(150%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                      border: `1px solid ${colors.border.active}`
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1.5 text-blue-500" />
                    <span className="text-xs font-bold text-white">Create</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={cn("flex-1 overflow-y-auto mt-4", isMobile ? "pb-4" : "")}>
          <div className="pr-4 space-y-2">
            {renderOptions()}
          </div>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
