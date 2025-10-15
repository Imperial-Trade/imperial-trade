import React from "react";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose
} from "@/components/ui/drawer";
import { Filter, TrendingUp, Users, Check, X } from "lucide-react";
import { signalColors } from "@/lib/design-system/signalColors";
import { cn } from "@/lib/utils";

interface MobileFilterSheetProps {
  type: 'status' | 'tradeType' | 'educator';
  isOpen: boolean;
  onClose: () => void;
  currentValue: string;
  onValueChange: (value: string) => void;
  options?: Array<{ value: string; label: string; icon?: any }>;
  educatorOptions?: Array<{ id: string; name: string }>;
}

export function MobileFilterSheet({
  type,
  isOpen,
  onClose,
  currentValue,
  onValueChange,
  options = [],
  educatorOptions = []
}: MobileFilterSheetProps) {
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
    if (type === 'educator' && educatorOptions.length > 0) {
      return (
        <>
          <button
            onClick={() => {
              onValueChange('all');
              onClose();
            }}
            className={cn(
              "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all duration-200",
              currentValue !== 'all' && "hover:bg-white/5"
            )}
            style={currentValue === 'all' ? {
              background: signalColors.state.active,
              borderLeft: `4px solid ${signalColors.accent.gold}`,
            } : {
              background: 'transparent',
            }}
          >
            <Users className="w-5 h-5" style={{ color: currentValue === 'all' ? signalColors.accent.gold : signalColors.text.tertiary }} />
            <span className="flex-1 text-left font-medium" style={{ color: currentValue === 'all' ? signalColors.text.gold : signalColors.text.primary }}>
              All Educators
            </span>
            {currentValue === 'all' && <Check className="w-5 h-5" style={{ color: signalColors.accent.gold }} />}
          </button>
          {educatorOptions.map((educator) => (
            <button
              key={educator.id}
              onClick={() => {
                onValueChange(educator.id);
                onClose();
              }}
              className={cn(
                "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all duration-200",
                currentValue !== educator.id && "hover:bg-white/5"
              )}
              style={currentValue === educator.id ? {
                background: signalColors.state.active,
                borderLeft: `4px solid ${signalColors.accent.gold}`,
              } : {
                background: 'transparent',
              }}
            >
              <Users className="w-5 h-5" style={{ color: currentValue === educator.id ? signalColors.accent.gold : signalColors.text.tertiary }} />
              <span className="flex-1 text-left font-medium" style={{ color: currentValue === educator.id ? signalColors.text.gold : signalColors.text.primary }}>
                {educator.name}
              </span>
              {currentValue === educator.id && <Check className="w-5 h-5" style={{ color: signalColors.accent.gold }} />}
            </button>
          ))}
        </>
      );
    }

    return options.map((option) => {
      const isActive = currentValue === option.value;
      // Use green for trade type active state, gold for others
      const activeColor = type === 'tradeType' ? signalColors.accent.green : signalColors.accent.gold;
      
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
            background: type === 'tradeType' ? signalColors.semantic.success : signalColors.state.active,
            borderLeft: `4px solid ${activeColor}`,
          } : {
            background: 'transparent',
          }}
        >
          {option.icon && (
            <span className="w-5 h-5 flex items-center justify-center">
              {React.createElement(option.icon, { 
                className: "w-5 h-5",
                style: { color: isActive ? activeColor : signalColors.text.tertiary }
              })}
            </span>
          )}
          <span className="flex-1 text-left font-medium" style={{ color: isActive ? activeColor : signalColors.text.primary }}>
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
        className="max-h-[70vh]"
        style={{
          background: signalColors.bg.glass,
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderTop: `1px solid ${signalColors.border.default}`,
        }}
      >
        <DrawerHeader style={{ borderBottom: `1px solid ${signalColors.border.default}` }} className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span style={{ color: signalColors.text.gold }}>{getIcon()}</span>
              <DrawerTitle style={{ color: signalColors.text.primary }}>{getTitle()}</DrawerTitle>
            </div>
            <DrawerClose asChild>
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
                style={{
                  background: signalColors.state.hover,
                  color: signalColors.text.secondary,
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
