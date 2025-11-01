import React from 'react';
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose
} from "@/components/ui/drawer";
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSignalTheme } from '@/hooks/useSignalTheme';

interface SignalSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function SignalSearchSheet({
  isOpen,
  onClose,
  searchValue,
  onSearchChange
}: SignalSearchSheetProps) {
  const { colors } = useSignalTheme();

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent 
        className="max-h-[70vh] rounded-t-3xl z-[110]"
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
              <Search className="w-5 h-5" style={{ color: colors.text.accent }} />
              <DrawerTitle style={{ color: colors.text.primary }}>Search Signals</DrawerTitle>
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
        
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10 pointer-events-none" 
              style={{ color: colors.text.tertiary }}
            />
            
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by symbol, asset, or educator..."
              className="h-12 pl-12 pr-12 text-base rounded-xl border transition-all duration-200"
              style={{
                background: colors.bg.surface,
                borderColor: colors.border.default,
                color: colors.text.primary,
              }}
              autoFocus
            />

            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
                style={{
                  background: colors.state.danger,
                  color: colors.accent.danger,
                }}
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-sm" style={{ color: colors.text.tertiary }}>
            <p>Search by trading symbol, asset name, or educator name to filter signals.</p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
