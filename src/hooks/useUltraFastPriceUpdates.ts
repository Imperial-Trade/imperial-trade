/**
 * ULTRA-FAST PRICE UPDATES HOOK
 * Direct DOM manipulation for sub-React performance
 */

import { useEffect, useRef, useCallback } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

interface UltraFastPriceConfig {
  symbol: string;
  elementId: string; // DOM element ID to update directly
  formatPrice?: (price: number) => string;
  enableAnimation?: boolean;
}

export function useUltraFastPriceUpdates(config: UltraFastPriceConfig) {
  const { prices, connectionStatus, subscribe, getPrice } = useOptimizedWebSocketPrices();
  const lastPriceRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  
  const formatPrice = config.formatPrice || ((price: number) => 
    price >= 1000 ? price.toFixed(2) : price.toFixed(5)
  );
  
  // Subscribe to symbol immediately
  useEffect(() => {
    if (config.symbol) {
      subscribe([config.symbol]);
    }
  }, [config.symbol, subscribe]);
  
  // ULTRA-FAST: Direct DOM updates bypass React rendering
  const updatePriceElement = useCallback((price: number, change: number) => {
    const element = document.getElementById(config.elementId);
    if (!element) return;
    
    // Direct DOM manipulation for maximum speed
    element.textContent = `$${formatPrice(price)}`;
    
    // ULTRA-FAST: Animation without React re-renders
    if (config.enableAnimation && lastPriceRef.current !== null) {
      const isIncrease = price > lastPriceRef.current;
      
      // Clear previous animation
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      // Apply animation class directly
      element.className = element.className.replace(/\b(price-up|price-down)\b/g, '');
      element.classList.add(isIncrease ? 'price-up' : 'price-down');
      
      // Remove animation class after brief period
      animationTimeoutRef.current = setTimeout(() => {
        element.classList.remove('price-up', 'price-down');
      }, 200);
    }
    
    lastPriceRef.current = price;
  }, [config.elementId, config.enableAnimation, formatPrice]);
  
  // Listen for price updates and apply them directly
  useEffect(() => {
    const priceData = getPrice(config.symbol);
    if (priceData && priceData.price !== lastPriceRef.current) {
      updatePriceElement(priceData.price, priceData.change);
    }
  }, [prices[config.symbol], config.symbol, getPrice, updatePriceElement]);
  
  return {
    connectionStatus,
    currentPrice: getPrice(config.symbol)?.price || null,
    isConnected: connectionStatus === 'connected'
  };
}