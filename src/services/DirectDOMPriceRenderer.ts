/**
 * Direct DOM Price Renderer Service
 * Bypasses React virtual DOM for maximum performance
 */

interface ElementRegistration {
  element: HTMLElement;
  type: 'price' | 'change' | 'bid' | 'ask' | 'spread';
  symbol: string;
  lastValue: string;
  animationFrame: number | null;
}

interface AnimationState {
  startTime: number;
  duration: number;
  fromValue: number;
  toValue: number;
  easing: (t: number) => number;
}

export class DirectDOMPriceRenderer {
  private registrations: Map<HTMLElement, ElementRegistration> = new Map();
  private animationStates: Map<HTMLElement, AnimationState> = new Map();
  private masterAnimationFrame: number | null = null;
  private isAnimating = false;

  // Performance tracking
  private performanceMetrics = {
    totalUpdates: 0,
    averageUpdateTime: 0,
    peakUpdateTime: 0,
    droppedFrames: 0,
    activeAnimations: 0
  };

  // Easing functions for smooth animations
  private easingFunctions = {
    easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
    easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    easeOutElastic: (t: number): number => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
  };

  /**
   * Register DOM element for direct manipulation
   */
  registerElement(
    symbol: string, 
    element: HTMLElement, 
    type: 'price' | 'change' | 'bid' | 'ask' | 'spread'
  ): void {
    const registration: ElementRegistration = {
      element,
      type,
      symbol,
      lastValue: '',
      animationFrame: null
    };

    this.registrations.set(element, registration);
    
    // Add CSS classes for animations
    element.classList.add('direct-dom-element', `type-${type}`);
    
    console.log(`📋 Direct DOM: Registered ${type} element for ${symbol}`);
  }

  /**
   * Unregister DOM element
   */
  unregisterElement(element: HTMLElement): void {
    const registration = this.registrations.get(element);
    if (registration && registration.animationFrame) {
      cancelAnimationFrame(registration.animationFrame);
    }
    
    this.registrations.delete(element);
    this.animationStates.delete(element);
    
    // Remove CSS classes
    element.classList.remove('direct-dom-element', 'price-up', 'price-down', 'change-positive', 'change-negative');
  }

  /**
   * Update specific element with new value
   */
  updateElement(
    element: HTMLElement, 
    newValue: string | number, 
    options: {
      animate?: boolean;
      animationDuration?: number;
      changeDirection?: 'up' | 'down' | 'none';
      decimalPlaces?: number;
    } = {}
  ): void {
    const registration = this.registrations.get(element);
    if (!registration) return;

    const {
      animate = true,
      animationDuration = 150,
      changeDirection = 'none',
      decimalPlaces = 5
    } = options;

    const updateStart = performance.now();
    const formattedValue = typeof newValue === 'number' 
      ? newValue.toFixed(decimalPlaces) 
      : newValue.toString();

    // Skip if value hasn't changed
    if (registration.lastValue === formattedValue) return;

    const oldValue = registration.lastValue;
    registration.lastValue = formattedValue;

    if (animate && oldValue && !isNaN(parseFloat(oldValue))) {
      this.animateValueChange(element, parseFloat(oldValue), parseFloat(formattedValue), {
        duration: animationDuration,
        changeDirection
      });
    } else {
      this.setElementValue(element, formattedValue, changeDirection);
    }

    // Update performance metrics
    const updateTime = performance.now() - updateStart;
    this.performanceMetrics.totalUpdates++;
    this.performanceMetrics.averageUpdateTime = 
      (this.performanceMetrics.averageUpdateTime + updateTime) / 2;
    this.performanceMetrics.peakUpdateTime = Math.max(
      this.performanceMetrics.peakUpdateTime, 
      updateTime
    );
  }

  /**
   * Set element value directly without animation
   */
  private setElementValue(
    element: HTMLElement, 
    value: string, 
    changeDirection: 'up' | 'down' | 'none' = 'none'
  ): void {
    // Direct DOM manipulation - bypassing React entirely
    element.textContent = value;

    // Add visual feedback classes
    this.applyChangeEffect(element, changeDirection);
  }

  /**
   * Animate value change with smooth transitions
   */
  private animateValueChange(
    element: HTMLElement, 
    fromValue: number, 
    toValue: number, 
    options: {
      duration: number;
      changeDirection: 'up' | 'down' | 'none';
    }
  ): void {
    const { duration, changeDirection } = options;
    
    // Cancel existing animation
    const existingAnimation = this.animationStates.get(element);
    if (existingAnimation) {
      this.animationStates.delete(element);
    }

    // Create new animation state
    const animationState: AnimationState = {
      startTime: performance.now(),
      duration,
      fromValue,
      toValue,
      easing: this.easingFunctions.easeOutCubic
    };

    this.animationStates.set(element, animationState);
    this.performanceMetrics.activeAnimations++;

    // Start animation loop if not already running
    if (!this.isAnimating) {
      this.startAnimationLoop();
    }

    // Apply immediate visual feedback
    this.applyChangeEffect(element, changeDirection);
  }

  /**
   * Apply visual change effects
   */
  private applyChangeEffect(element: HTMLElement, changeDirection: 'up' | 'down' | 'none'): void {
    // Remove existing change classes
    element.classList.remove('price-up', 'price-down', 'change-positive', 'change-negative');

    if (changeDirection === 'up') {
      element.classList.add('price-up', 'change-positive');
    } else if (changeDirection === 'down') {
      element.classList.add('price-down', 'change-negative');
    }

    // Auto-remove change classes after animation
    setTimeout(() => {
      element.classList.remove('price-up', 'price-down', 'change-positive', 'change-negative');
    }, 300);
  }

  /**
   * Start master animation loop
   */
  private startAnimationLoop(): void {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    
    const animate = () => {
      const currentTime = performance.now();
      const elementsToRemove: HTMLElement[] = [];

      this.animationStates.forEach((animationState, element) => {
        const elapsed = currentTime - animationState.startTime;
        const progress = Math.min(elapsed / animationState.duration, 1);
        
        if (progress >= 1) {
          // Animation complete
          element.textContent = animationState.toValue.toFixed(5);
          elementsToRemove.push(element);
        } else {
          // Continue animation
          const easedProgress = animationState.easing(progress);
          const currentValue = animationState.fromValue + 
            (animationState.toValue - animationState.fromValue) * easedProgress;
          
          element.textContent = currentValue.toFixed(5);
        }
      });

      // Remove completed animations
      elementsToRemove.forEach(element => {
        this.animationStates.delete(element);
        this.performanceMetrics.activeAnimations--;
      });

      // Continue loop if animations remain
      if (this.animationStates.size > 0) {
        this.masterAnimationFrame = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.masterAnimationFrame = null;
      }
    };

    this.masterAnimationFrame = requestAnimationFrame(animate);
  }

  /**
   * Batch update multiple elements for efficiency
   */
  batchUpdate(updates: Array<{
    element: HTMLElement;
    value: string | number;
    options?: {
      animate?: boolean;
      animationDuration?: number;
      changeDirection?: 'up' | 'down' | 'none';
      decimalPlaces?: number;
    };
  }>): void {
    const batchStart = performance.now();

    // Process all updates in a single frame
    requestAnimationFrame(() => {
      updates.forEach(({ element, value, options }) => {
        this.updateElement(element, value, options);
      });

      const batchTime = performance.now() - batchStart;
      console.log(`📦 Direct DOM batch update: ${updates.length} elements in ${batchTime.toFixed(2)}ms`);
    });
  }

  /**
   * Update all registered elements for a symbol
   */
  updateSymbol(
    symbol: string, 
    data: {
      price?: number;
      bid?: number;
      ask?: number;
      change?: number;
      changePercent?: number;
      spread?: number;
    },
    options: {
      animate?: boolean;
      animationDuration?: number;
      priceDecimalPlaces?: number;
    } = {}
  ): void {
    const {
      animate = true,
      animationDuration = 150,
      priceDecimalPlaces = 5
    } = options;

    const updates: Array<any> = [];

    this.registrations.forEach((registration, element) => {
      if (registration.symbol !== symbol) return;

      let value: string | number = '';
      let changeDirection: 'up' | 'down' | 'none' = 'none';

      switch (registration.type) {
        case 'price':
          if (data.price !== undefined) {
            value = data.price;
            changeDirection = data.change && data.change > 0 ? 'up' : 
                            data.change && data.change < 0 ? 'down' : 'none';
          }
          break;
        case 'bid':
          if (data.bid !== undefined) value = data.bid;
          break;
        case 'ask':
          if (data.ask !== undefined) value = data.ask;
          break;
        case 'change':
          if (data.changePercent !== undefined) {
            value = `${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`;
            changeDirection = data.changePercent > 0 ? 'up' : 
                            data.changePercent < 0 ? 'down' : 'none';
          }
          break;
        case 'spread':
          if (data.spread !== undefined) value = data.spread;
          break;
      }

      if (value !== '') {
        updates.push({
          element,
          value,
          options: {
            animate,
            animationDuration,
            changeDirection,
            decimalPlaces: priceDecimalPlaces
          }
        });
      }
    });

    if (updates.length > 0) {
      this.batchUpdate(updates);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    totalUpdates: number;
    averageUpdateTime: number;
    peakUpdateTime: number;
    droppedFrames: number;
    activeAnimations: number;
    registeredElements: number;
  } {
    return {
      ...this.performanceMetrics,
      registeredElements: this.registrations.size
    };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      totalUpdates: 0,
      averageUpdateTime: 0,
      peakUpdateTime: 0,
      droppedFrames: 0,
      activeAnimations: 0
    };
  }

  /**
   * Cleanup all registrations and animations
   */
  cleanup(): void {
    // Cancel master animation frame
    if (this.masterAnimationFrame) {
      cancelAnimationFrame(this.masterAnimationFrame);
      this.masterAnimationFrame = null;
    }

    // Cancel individual animation frames
    this.registrations.forEach((registration) => {
      if (registration.animationFrame) {
        cancelAnimationFrame(registration.animationFrame);
      }
    });

    // Clear all data
    this.registrations.clear();
    this.animationStates.clear();
    this.isAnimating = false;

    console.log('🛑 Direct DOM Price Renderer cleanup complete');
  }
}

// Singleton instance
export const directDOMPriceRenderer = new DirectDOMPriceRenderer();