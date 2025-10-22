import React from "react";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose
} from "@/components/ui/drawer";
import { Filter, TrendingUp, Users, Check, X } from "lucide-react";
import { useSignalTheme } from "@/hooks/useSignalTheme";
import { cn } from "@/lib/utils";

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
  onEducatorsChange
}: MobileFilterSheetProps) {
  const { colors } = useSignalTheme();
  
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
      const isAllSelected = selectedEducators.length === allEducatorIds.length;
      
      const toggleAllEducators = () => {
        if (isAllSelected) {
          onEducatorsChange([]);
        } else {
          onEducatorsChange(allEducatorIds);
        }
      };
      
      const toggleEducator = (educatorId: string) => {
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
            const isSelected = selectedEducators.includes(educator.id);
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
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent 
        className="max-h-[70vh] rounded-t-3xl"
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
              <span style={{ color: colors.text.accent }}>{getIcon()}</span>
              <DrawerTitle style={{ color: colors.text.primary }}>{getTitle()}</DrawerTitle>
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
        </DrawerHeader>
        
        <div className="p-4 space-y-2 overflow-y-auto">
          {renderOptions()}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
