import { useState, useCallback, useRef, useEffect } from 'react';

export type SheetType = 'recent' | 'search' | 'filter' | 'alerts' | null;
export type SlideDirection = 'left' | 'right' | null;

interface UseSheetNavigationReturn {
  activeSheet: SheetType | null;
  slideDirection: SlideDirection | null;
  isTransitioning: boolean;
  toggleSheet: (type: SheetType) => void;
  closeSheet: () => void;
}

export function useSheetNavigation(): UseSheetNavigationReturn {
  const [activeSheet, setActiveSheet] = useState<SheetType | null>(null);
  const [slideDirection, setSlideDirection] = useState<SlideDirection | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousSheetRef = useRef<SheetType | null>(null);

  // Determine slide direction based on sheet order
  const getSlideDirection = useCallback((from: SheetType | null, to: SheetType | null): SlideDirection | null => {
    if (!from || !to) return null;
    
    // Define sheet order for navigation
    const sheetOrder: SheetType[] = ['recent', 'search', 'filter', 'alerts'];
    const fromIndex = sheetOrder.indexOf(from);
    const toIndex = sheetOrder.indexOf(to);
    
    if (fromIndex === -1 || toIndex === -1) return null;
    
    return toIndex > fromIndex ? 'right' : 'left';
  }, []);

  const toggleSheet = useCallback((type: SheetType) => {
    if (activeSheet === type) {
      // If clicking the same sheet, close it
      setActiveSheet(null);
      setSlideDirection(null);
      previousSheetRef.current = null;
    } else {
      // Determine slide direction
      const direction = getSlideDirection(activeSheet, type);
      setSlideDirection(direction);
      previousSheetRef.current = activeSheet;
      setActiveSheet(type);
      
      // Set transitioning state
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 500); // Match animation duration
    }
  }, [activeSheet, getSlideDirection]);

  const closeSheet = useCallback(() => {
    previousSheetRef.current = activeSheet;
    setActiveSheet(null);
    setSlideDirection(null);
    setIsTransitioning(false);
  }, [activeSheet]);

  return {
    activeSheet,
    slideDirection,
    isTransitioning,
    toggleSheet,
    closeSheet,
  };
}



