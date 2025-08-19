import { useCallback } from 'react';
import { useVisualStateManager } from './useVisualStateManager';

interface PriceAnimationConfig {
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  enableAnimations?: boolean;
}

/**
 * Smart price animation hook with symbol-specific thresholds
 * Prevents excessive blinking by using intelligent animation control
 */
export function usePriceAnimations() {
  const visualStateManager = useVisualStateManager({
    animationDuration: 500, // Subtle 500ms flash
    cooldownPeriod: 2000,   // 2 second cooldown between animations  
    maxAnimationsPerSecond: 1, // Max 1 animation per second
    minChangePercent: 0.02,
    significanceThresholds: {
      forex: 0.05,   // 0.05% for forex pairs
      crypto: 0.1,   // 0.1% for crypto  
      gold: 0.015,   // 0.015% for gold (~$0.50 at $3300)
      indices: 0.02  // 0.02% for indices
    }
  });

  const triggerPriceAnimation = useCallback(({
    symbol,
    currentPrice, 
    previousPrice,
    enableAnimations = true
  }: PriceAnimationConfig) => {
    if (!enableAnimations) return;
    
    const animationId = `price-${symbol}`;
    visualStateManager.triggerPriceAnimation(
      animationId, 
      previousPrice, 
      currentPrice,
      symbol
    );
  }, [visualStateManager]);

  const getPriceAnimationClass = useCallback((symbol: string) => {
    const animationId = `price-${symbol}`;
    const state = visualStateManager.getVisualState(animationId);
    
    if (!state.isHighlighting) return 'text-accent-green';
    
    // Subtle flash instead of continuous pulse
    return state.priceAnimation === 'up' 
      ? 'text-green-400 bg-green-400/5 animate-flash-green'
      : 'text-red-400 bg-red-400/5 animate-flash-red';
  }, [visualStateManager]);

  const clearAnimationsForSymbol = useCallback((symbol: string) => {
    const animationId = `price-${symbol}`;
    visualStateManager.clearAnimations(animationId);
  }, [visualStateManager]);

  return {
    triggerPriceAnimation,
    getPriceAnimationClass,
    clearAnimationsForSymbol,
    animationQueueLength: visualStateManager.animationQueueLength
  };
}