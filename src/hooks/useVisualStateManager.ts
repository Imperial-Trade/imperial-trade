import { useState, useRef, useCallback, useEffect } from 'react';

interface VisualState {
  priceAnimation: 'up' | 'down' | null;
  isHighlighting: boolean;
  lastAnimationTime: number;
}

interface AnimationConfig {
  minChangePercent: number; // Minimum change to trigger animation
  animationDuration: number; // Duration in ms
  cooldownPeriod: number; // Minimum time between animations
  maxAnimationsPerSecond: number; // Rate limiting
  significanceThresholds: {
    forex: number; // 0.05% for forex pairs
    crypto: number; // 0.1% for crypto
    gold: number; // $0.50 for gold
    indices: number; // 0.02% for indices
  };
}

/**
 * Visual State Manager - Coordinated animation controller
 * Prevents animation conflicts and reduces visual noise
 */
export function useVisualStateManager(config: AnimationConfig = {
  minChangePercent: 0.02,
  animationDuration: 500, // Reduced from 300ms to 500ms for subtle flash
  cooldownPeriod: 2000, // Increased to 2 seconds to reduce noise
  maxAnimationsPerSecond: 1, // Reduced to 1 per second max
  significanceThresholds: {
    forex: 0.05,
    crypto: 0.1, 
    gold: 0.015, // 0.015% for $0.50 at $3300
    indices: 0.02
  }
}) {
  const [visualStates, setVisualStates] = useState<Record<string, VisualState>>({});
  const animationTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const frameQueue = useRef<Array<{ id: string; animation: 'up' | 'down' }>>([]);
  const processingFrame = useRef(false);

  const processAnimationQueue = useCallback(() => {
    if (processingFrame.current || frameQueue.current.length === 0) return;
    
    processingFrame.current = true;
    
    requestAnimationFrame(() => {
      const maxAnimations = Math.floor(config.maxAnimationsPerSecond);
      const animationsToProcess = frameQueue.current.splice(0, maxAnimations);
      
      animationsToProcess.forEach(({ id, animation }) => {
        setVisualStates(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            priceAnimation: animation,
            isHighlighting: true,
            lastAnimationTime: Date.now()
          }
        }));

        // Clear animation after duration
        if (animationTimeouts.current[id]) {
          clearTimeout(animationTimeouts.current[id]);
        }
        
        animationTimeouts.current[id] = setTimeout(() => {
          setVisualStates(prev => ({
            ...prev,
            [id]: {
              ...prev[id],
              priceAnimation: null,
              isHighlighting: false
            }
          }));
          delete animationTimeouts.current[id];
        }, config.animationDuration);
      });
      
      processingFrame.current = false;
      
      // Process remaining queue if any
      if (frameQueue.current.length > 0) {
        setTimeout(processAnimationQueue, 50);
      }
    });
  }, [config.animationDuration, config.maxAnimationsPerSecond]);

  const getSignificanceThreshold = useCallback((symbol: string): number => {
    const upperSymbol = symbol.toUpperCase();
    if (upperSymbol.includes('XAU') || upperSymbol.includes('GOLD')) {
      return config.significanceThresholds.gold;
    }
    if (upperSymbol.includes('BTC') || upperSymbol.includes('ETH')) {
      return config.significanceThresholds.crypto;
    }
    if (upperSymbol.includes('USA30') || upperSymbol.includes('NAS100') || upperSymbol.includes('SPX500')) {
      return config.significanceThresholds.indices;
    }
    return config.significanceThresholds.forex;
  }, [config.significanceThresholds]);

  const triggerPriceAnimation = useCallback((
    id: string, 
    oldPrice: number, 
    newPrice: number,
    symbol?: string,
    volatilityMultiplier: number = 1.0
  ) => {
    if (oldPrice <= 0 || newPrice <= 0) return;
    
    const changePercent = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
    
    // Use symbol-specific significance threshold with volatility adjustment
    const baseThreshold = symbol ? getSignificanceThreshold(symbol) : config.minChangePercent;
    const adjustedThreshold = baseThreshold * volatilityMultiplier;
    if (changePercent < adjustedThreshold) return;
    
    const currentState = visualStates[id];
    const now = Date.now();
    
    // Check cooldown period
    if (currentState?.lastAnimationTime && 
        now - currentState.lastAnimationTime < config.cooldownPeriod) {
      return;
    }

    const animation = newPrice > oldPrice ? 'up' : 'down';
    
    // Add to queue for processing
    frameQueue.current.push({ id, animation });
    processAnimationQueue();
  }, [visualStates, config.minChangePercent, config.cooldownPeriod, processAnimationQueue, getSignificanceThreshold]);

  const getVisualState = useCallback((id: string): VisualState => {
    return visualStates[id] || {
      priceAnimation: null,
      isHighlighting: false,
      lastAnimationTime: 0
    };
  }, [visualStates]);

  const clearAnimations = useCallback((id: string) => {
    if (animationTimeouts.current[id]) {
      clearTimeout(animationTimeouts.current[id]);
      delete animationTimeouts.current[id];
    }
    
    setVisualStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        priceAnimation: null,
        isHighlighting: false
      }
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(animationTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return {
    triggerPriceAnimation,
    getVisualState,
    clearAnimations,
    animationQueueLength: frameQueue.current.length
  };
}