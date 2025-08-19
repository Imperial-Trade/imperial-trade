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
}

/**
 * Visual State Manager - Coordinated animation controller
 * Prevents animation conflicts and reduces visual noise
 */
export function useVisualStateManager(config: AnimationConfig = {
  minChangePercent: 0.02,
  animationDuration: 300,
  cooldownPeriod: 1000,
  maxAnimationsPerSecond: 2
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

  const triggerPriceAnimation = useCallback((
    id: string, 
    oldPrice: number, 
    newPrice: number
  ) => {
    if (oldPrice <= 0 || newPrice <= 0) return;
    
    const changePercent = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
    
    // Check if change is significant enough
    if (changePercent < config.minChangePercent) return;
    
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
  }, [visualStates, config.minChangePercent, config.cooldownPeriod, processAnimationQueue]);

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