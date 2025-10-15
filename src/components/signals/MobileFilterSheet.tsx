import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose
} from "@/components/ui/drawer";
import { Filter, TrendingUp, Users, Check, X } from "lucide-react";
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
              "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all",
              "hover:bg-accent/50",
              currentValue === 'all' && "bg-primary/10 border-l-4 border-primary"
            )}
          >
            <Users className="w-5 h-5" />
            <span className="flex-1 text-left font-medium">All Educators</span>
            {currentValue === 'all' && <Check className="w-5 h-5 text-primary" />}
          </button>
          {educatorOptions.map((educator) => (
            <button
              key={educator.id}
              onClick={() => {
                onValueChange(educator.id);
                onClose();
              }}
              className={cn(
                "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all",
                "hover:bg-accent/50",
                currentValue === educator.id && "bg-primary/10 border-l-4 border-primary"
              )}
            >
              <Users className="w-5 h-5" />
              <span className="flex-1 text-left font-medium">{educator.name}</span>
              {currentValue === educator.id && <Check className="w-5 h-5 text-primary" />}
            </button>
          ))}
        </>
      );
    }

    return options.map((option) => (
      <button
        key={option.value}
        onClick={() => {
          onValueChange(option.value);
          onClose();
        }}
        className={cn(
          "w-full min-h-14 px-4 flex items-center gap-3 rounded-lg transition-all",
          "hover:bg-accent/50",
          currentValue === option.value && "bg-primary/10 border-l-4 border-primary"
        )}
      >
        {option.icon && <span className="w-5 h-5 flex items-center justify-center">{option.icon}</span>}
        <span className="flex-1 text-left font-medium">{option.label}</span>
        {currentValue === option.value && <Check className="w-5 h-5 text-primary" />}
      </button>
    ));
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getIcon()}
              <DrawerTitle>{getTitle()}</DrawerTitle>
            </div>
            <DrawerClose asChild>
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent/50 transition-colors"
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
