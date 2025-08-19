import { useRef, useEffect, useMemo } from 'react';

interface UseStableSymbolManagerReturn {
  stableSymbols: string[];
  hasChanged: boolean;
}

/**
 * Stable Symbol Manager - Prevents subscription thrashing
 * Only triggers updates when symbols actually change, not on re-renders
 */
export function useStableSymbolManager(symbols: string[]): UseStableSymbolManagerReturn {
  const previousSymbolsRef = useRef<string[]>([]);
  const stableSymbolsRef = useRef<string[]>([]);

  // Deep comparison and stable reference management
  const hasChanged = useMemo(() => {
    const current = symbols.sort();
    const previous = previousSymbolsRef.current.sort();
    
    if (current.length !== previous.length) return true;
    
    for (let i = 0; i < current.length; i++) {
      if (current[i] !== previous[i]) return true;
    }
    
    return false;
  }, [symbols]);

  // Only update stable reference when symbols actually change
  useEffect(() => {
    if (hasChanged) {
      console.log('🔄 Symbol change detected:', {
        previous: previousSymbolsRef.current,
        current: symbols,
        added: symbols.filter(s => !previousSymbolsRef.current.includes(s)),
        removed: previousSymbolsRef.current.filter(s => !symbols.includes(s))
      });
      
      stableSymbolsRef.current = [...symbols];
      previousSymbolsRef.current = [...symbols];
    }
  }, [symbols, hasChanged]);

  return {
    stableSymbols: stableSymbolsRef.current,
    hasChanged
  };
}