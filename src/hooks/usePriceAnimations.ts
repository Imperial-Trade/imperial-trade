import { useCallback, useMemo } from 'react';
import { useVisualStateManager } from './useVisualStateManager';
import { useAnimationPreferences } from './useAnimationPreferences';

interface PriceAnimationConfig {
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  enableAnimations?: boolean;
  marketVolatility?: 'low' | 'normal' | 'high';
  isMarketOpen?: boolean;
}

/**
 * Enhanced price animation hook with user preferences and advanced features
 * Includes market session awareness and volatility-based adjustments
 */
export function usePriceAnimations() {
  const { preferences, getAnimationDuration, shouldShowAnimation, getAnimationClass } = useAnimationPreferences();
  
  const dynamicConfig = useMemo(() => ({
    animationDuration: getAnimationDuration(),
    cooldownPeriod: preferences.sensitivity === 'high' ? 1000 : preferences.sensitivity === 'low' ? 3000 : 2000,
    maxAnimationsPerSecond: preferences.sensitivity === 'high' ? 2 : 1,
    minChangePercent: 0.02,
    significanceThresholds: {
      forex: 0.03,   // Refined: 0.03% for forex pairs
      crypto: 0.08,  // Refined: 0.08% for crypto  
      gold: 0.012,   // Refined: 0.012% for gold (~$0.40 at $3300)
      indices: 0.015 // Refined: 0.015% for indices
    }
  }), [preferences.sensitivity, getAnimationDuration]);

  const visualStateManager = useVisualStateManager(dynamicConfig);

  const triggerPriceAnimation = useCallback(({
    symbol,
    currentPrice, 
    previousPrice,
    enableAnimations = true,
    marketVolatility = 'normal',
    isMarketOpen = true
  }: PriceAnimationConfig) => {
    if (!enableAnimations || !preferences.enabled) return;
    
    // Adjust thresholds based on market conditions
    const volatilityMultiplier = marketVolatility === 'high' ? 1.5 : marketVolatility === 'low' ? 0.7 : 1.0;
    const sessionMultiplier = isMarketOpen ? 1.0 : 0.5; // Reduce sensitivity during off-hours
    
    const animationId = `price-${symbol}`;
    visualStateManager.triggerPriceAnimation(
      animationId, 
      previousPrice, 
      currentPrice,
      symbol,
      volatilityMultiplier * sessionMultiplier
    );
  }, [visualStateManager, preferences.enabled]);

  const getPriceAnimationClass = useCallback((symbol: string, isSignificantMove = false) => {
    const animationId = `price-${symbol}`;
    const state = visualStateManager.getVisualState(animationId);
    
    if (!state.isHighlighting) return 'text-accent-green';
    
    // Enhanced animation classes with intensity levels
    const direction = state.priceAnimation!;
    const animationClass = getAnimationClass(direction, isSignificantMove);
    const colorClass = direction === 'up' 
      ? 'text-accentGreen-light bg-accentGreen-light/5' 
      : 'text-destructive bg-destructive/5';
    
    return `${colorClass} ${animationClass}`;
  }, [visualStateManager, getAnimationClass]);

  const clearAnimationsForSymbol = useCallback((symbol: string) => {
    const animationId = `price-${symbol}`;
    visualStateManager.clearAnimations(animationId);
  }, [visualStateManager]);

  const getPerformanceMetrics = useCallback(() => {
    return {
      animationQueueLength: visualStateManager.animationQueueLength,
      preferences: preferences,
      isEnabled: preferences.enabled
    };
  }, [visualStateManager.animationQueueLength, preferences]);

  return {
    triggerPriceAnimation,
    getPriceAnimationClass,
    clearAnimationsForSymbol,
    animationQueueLength: visualStateManager.animationQueueLength,
    getPerformanceMetrics,
    preferences
  };
}