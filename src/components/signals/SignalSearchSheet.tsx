import React from 'react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSignalTheme } from '@/hooks/useSignalTheme';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { cn } from '@/lib/utils';
import type { SlideDirection } from '@/hooks/useSheetNavigation';

interface SignalSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  slideDirection?: SlideDirection;
}

export function SignalSearchSheet({
  isOpen,
  onClose,
  searchValue,
  onSearchChange,
  slideDirection
}: SignalSearchSheetProps) {
  const { colors, isDark } = useSignalTheme();
  const { isMobile } = useDeviceDetection();

  // Get animation class based on slide direction
  const getSlideAnimationClass = () => {
    if (!slideDirection || isMobile) return '';
    switch (slideDirection) {
      case 'left': return 'sheet-slide-in-left';
      case 'right': return 'sheet-slide-in-right';
      default: return '';
    }
  };

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
          paddingBottom: isMobile ? 0 : 'max(env(safe-area-inset-bottom, 0px), 12px)',
          ...(isMobile && {
            bottom: '72px', // Position just above bottom nav bar - no gap
            marginBottom: 0,
          }),
        }}
      >
        {/* Drag Handle Indicator - Instagram style */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-400/50 rounded-full" />
          </div>
        )}
        
        <div className={cn("flex flex-col h-full overflow-hidden", isMobile ? "px-4" : "")}>
          {/* Title Header - Desktop/Tablet only */}
          {!isMobile && (
            <div 
              className="px-6 pt-4 pb-4 border-b border-border/50 sticky top-0 z-10"
              style={{
                background: isDark ? 'rgba(15, 15, 20, 0.95)' : '#FFFFFF',
                backdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
                WebkitBackdropFilter: isDark ? 'blur(30px) saturate(180%)' : 'none',
              }}
            >
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5" style={{ color: '#D4AF37' }} />
                <span className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                  Search
                </span>
              </div>
            </div>
          )}
          
          <div className={cn("flex-1 overflow-y-auto", isMobile ? "pb-4" : "mt-4")}>
            <div className={cn("space-y-4", isMobile ? "" : "px-6")}>
              <div className="relative">
                <Search 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10 pointer-events-none" 
                  style={{ color: colors.text.tertiary }}
                />
                
                <Input
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search by symbol, asset, or educator..."
                  className="h-12 pl-12 pr-12 text-base rounded-xl border transition-all duration-200 focus:ring-0 focus:ring-offset-0 focus:border-white/30 focus-visible:ring-0 focus-visible:ring-offset-0"
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
