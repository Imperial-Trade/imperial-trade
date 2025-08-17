/**
 * Zero-Latency Price Engine Hook
 * Direct DOM manipulation with Web Workers and SharedArrayBuffer for institutional-grade performance
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { directDOMPriceRenderer } from '../services/DirectDOMPriceRenderer';
import { useFIXRealTimePrice } from './useFIXRealTimePrice';

interface ZeroLatencyConfig {
  enableDirectDOM: boolean;
  enableWebWorker: boolean;
  enableSharedMemory: boolean;
  targetFPS: number;
  priceDecimalPlaces: number;
  animationDuration: number;
}

interface ZeroLatencyPriceData {
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  timestamp: number;
  renderLatency: number;
  frameRate: number;
  isDirectRendered: boolean;
  workerCalculated: boolean;
}

interface PriceWorkerMessage {
  type: 'PRICE_UPDATE' | 'CALCULATION_RESULT' | 'WORKER_READY';
  symbol?: string;
  data?: any;
  timestamp: number;
  requestId?: string;
}

export function useZeroLatencyPriceEngine(
  symbol: string,
  config: Partial<ZeroLatencyConfig> = {}
): ZeroLatencyPriceData & {
  registerElement: (element: HTMLElement, type: 'price' | 'change' | 'bid' | 'ask') => void;
  unregisterElement: (element: HTMLElement) => void;
  forceUpdate: () => void;
  getPerformanceMetrics: () => any;
} {
  const defaultConfig: ZeroLatencyConfig = {
    enableDirectDOM: true,
    enableWebWorker: true,
    enableSharedMemory: typeof SharedArrayBuffer !== 'undefined',
    targetFPS: 60,
    priceDecimalPlaces: 5,
    animationDuration: 150
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Get price data from FIX service
  const fixData = useFIXRealTimePrice(symbol);

  // Zero-latency state
  const [zeroLatencyData, setZeroLatencyData] = useState<ZeroLatencyPriceData>({
    price: 0,
    bid: 0,
    ask: 0,
    change: 0,
    changePercent: 0,
    timestamp: Date.now(),
    renderLatency: 0,
    frameRate: 60,
    isDirectRendered: false,
    workerCalculated: false
  });

  // Performance tracking
  const performanceRef = useRef({
    frameCount: 0,
    lastFrameTime: performance.now(),
    renderTimes: [] as number[],
    averageRenderTime: 0,
    peakRenderTime: 0,
    droppedFrames: 0
  });

  // Web Worker for background calculations
  const workerRef = useRef<Worker | null>(null);
  const sharedBufferRef = useRef<SharedArrayBuffer | null>(null);
  const sharedArrayRef = useRef<Float64Array | null>(null);

  // DOM elements registry
  const elementsRef = useRef<Map<HTMLElement, string>>(new Map());

  // Animation frame
  const animationFrameRef = useRef<number | null>(null);
  const lastPriceRef = useRef<number>(0);

  /**
   * Initialize Web Worker for background calculations
   */
  useEffect(() => {
    if (!finalConfig.enableWebWorker) return;

    try {
      // Create Web Worker for price calculations
      const workerCode = `
        // Price calculation worker
        const SHARED_BUFFER_SIZE = 1024; // 1KB shared buffer
        let sharedArray = null;
        let isProcessing = false;

        // Shared memory indices
        const INDICES = {
          PRICE: 0,
          BID: 1,
          ASK: 2,
          CHANGE: 3,
          CHANGE_PERCENT: 4,
          TIMESTAMP: 5,
          SEQUENCE: 6,
          VOLATILITY: 7,
          PROCESSING_FLAG: 8
        };

        self.onmessage = function(e) {
          const { type, data, requestId, timestamp } = e.data;
          
          if (type === 'INIT_SHARED_BUFFER' && data.buffer) {
            sharedArray = new Int32Array(data.buffer);
            postMessage({ 
              type: 'WORKER_READY', 
              timestamp: performance.now(),
              sharedMemoryEnabled: true 
            });
            return;
          }
          
          if (type === 'PRICE_UPDATE' && data) {
            const calculationStart = performance.now();
            
            // Perform calculations in background
            const result = calculatePriceMetrics(data);
            
            // Update shared memory if available
            if (sharedArray && !isProcessing) {
              isProcessing = true;
              Atomics.store(sharedArray, INDICES.PROCESSING_FLAG, 1);
              
              Atomics.store(sharedArray, INDICES.PRICE, Math.round(result.price * 100000));
              Atomics.store(sharedArray, INDICES.BID, Math.round(result.bid * 100000));
              Atomics.store(sharedArray, INDICES.ASK, Math.round(result.ask * 100000));
              Atomics.store(sharedArray, INDICES.CHANGE, Math.round(result.change * 100000));
              Atomics.store(sharedArray, INDICES.CHANGE_PERCENT, Math.round(result.changePercent * 10000));
              Atomics.store(sharedArray, INDICES.TIMESTAMP, Date.now());
              Atomics.store(sharedArray, INDICES.VOLATILITY, Math.round(result.volatility * 10000));
              
              Atomics.store(sharedArray, INDICES.PROCESSING_FLAG, 0);
              isProcessing = false;
            }
            
            const calculationTime = performance.now() - calculationStart;
            
            postMessage({
              type: 'CALCULATION_RESULT',
              data: result,
              requestId,
              timestamp: performance.now(),
              calculationTime
            });
          }
        };

        function calculatePriceMetrics(data) {
          const { price, bid, ask, previousPrice = price, timestamp } = data;
          
          // Calculate change metrics
          const change = price - previousPrice;
          const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
          
          // Calculate volatility (simplified)
          const volatility = Math.abs(changePercent) / 100;
          
          // Calculate spread
          const spread = ask - bid;
          const spreadPercent = price > 0 ? (spread / price) * 100 : 0;
          
          return {
            price,
            bid,
            ask,
            change,
            changePercent,
            volatility,
            spread,
            spreadPercent,
            timestamp: timestamp || Date.now(),
            quality: calculateQuality(spread, volatility)
          };
        }

        function calculateQuality(spread, volatility) {
          let quality = 1.0;
          
          // Penalize wide spreads
          if (spread > 0.001) quality -= 0.2;
          
          // Penalize high volatility
          if (volatility > 0.01) quality -= 0.3;
          
          return Math.max(0.1, quality);
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);

      // Initialize shared memory if supported
      if (finalConfig.enableSharedMemory) {
        const bufferSize = 64; // 64 * 8 bytes = 512 bytes
        sharedBufferRef.current = new SharedArrayBuffer(bufferSize * 8);
        sharedArrayRef.current = new Int32Array(sharedBufferRef.current);

        workerRef.current.postMessage({
          type: 'INIT_SHARED_BUFFER',
          data: { buffer: sharedBufferRef.current },
          timestamp: performance.now()
        });
      }

      // Handle worker messages
      workerRef.current.onmessage = (e: MessageEvent<PriceWorkerMessage>) => {
        const { type, data } = e.data;
        
        if (type === 'WORKER_READY') {
          console.log('🔧 Web Worker initialized with shared memory support');
        } else if (type === 'CALCULATION_RESULT' && data) {
          // Update state with worker-calculated data
          setZeroLatencyData(prev => ({
            ...prev,
            ...data,
            workerCalculated: true
          }));
        }
      };

      console.log('🚀 Zero-latency Web Worker initialized');

      return () => {
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        URL.revokeObjectURL(workerUrl);
      };
    } catch (error) {
      console.error('❌ Failed to initialize Web Worker:', error);
    }
  }, [finalConfig.enableWebWorker, finalConfig.enableSharedMemory]);

  /**
   * Register DOM element for direct manipulation
   */
  const registerElement = useCallback((element: HTMLElement, type: 'price' | 'change' | 'bid' | 'ask') => {
    if (!finalConfig.enableDirectDOM) return;

    elementsRef.current.set(element, type);
    directDOMPriceRenderer.registerElement(symbol, element, type);
    
    console.log(`📋 Registered DOM element for direct rendering: ${type}`);
  }, [symbol, finalConfig.enableDirectDOM]);

  /**
   * Unregister DOM element
   */
  const unregisterElement = useCallback((element: HTMLElement) => {
    elementsRef.current.delete(element);
    directDOMPriceRenderer.unregisterElement(element);
  }, []);

  /**
   * Direct DOM update with requestAnimationFrame
   */
  const updateDirectDOM = useCallback((priceData: any) => {
    if (!finalConfig.enableDirectDOM || elementsRef.current.size === 0) return;

    const updateStart = performance.now();

    // Cancel previous animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Schedule direct DOM update
    animationFrameRef.current = requestAnimationFrame(() => {
      elementsRef.current.forEach((type, element) => {
        try {
          let value: string;
          let changeClass = '';

          switch (type) {
            case 'price':
              value = priceData.price.toFixed(finalConfig.priceDecimalPlaces);
              changeClass = priceData.change > 0 ? 'price-up' : priceData.change < 0 ? 'price-down' : '';
              break;
            case 'bid':
              value = priceData.bid.toFixed(finalConfig.priceDecimalPlaces);
              break;
            case 'ask':
              value = priceData.ask.toFixed(finalConfig.priceDecimalPlaces);
              break;
            case 'change':
              value = `${priceData.change > 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%`;
              changeClass = priceData.change > 0 ? 'change-positive' : priceData.change < 0 ? 'change-negative' : '';
              break;
            default:
              return;
          }

          // Direct DOM manipulation - bypassing React entirely
          if (element.textContent !== value) {
            element.textContent = value;
            
            // Add change animation class
            if (changeClass) {
              element.className = element.className.replace(/(?:^|\\s)(?:price-up|price-down|change-positive|change-negative)(?!\\S)/g, '');
              element.classList.add(changeClass);
              
              // Remove animation class after duration
              setTimeout(() => {
                element.classList.remove(changeClass);
              }, finalConfig.animationDuration);
            }
          }
        } catch (error) {
          console.error('❌ Direct DOM update error:', error);
        }
      });

      // Update performance metrics
      const renderTime = performance.now() - updateStart;
      const perf = performanceRef.current;
      
      perf.renderTimes.push(renderTime);
      if (perf.renderTimes.length > 60) { // Keep last 60 frames
        perf.renderTimes.shift();
      }
      
      perf.averageRenderTime = perf.renderTimes.reduce((sum, time) => sum + time, 0) / perf.renderTimes.length;
      perf.peakRenderTime = Math.max(perf.peakRenderTime, renderTime);
      
      // Calculate frame rate
      const now = performance.now();
      const deltaTime = now - perf.lastFrameTime;
      const currentFPS = 1000 / deltaTime;
      
      if (currentFPS < finalConfig.targetFPS * 0.9) { // 90% of target
        perf.droppedFrames++;
      }
      
      perf.frameCount++;
      perf.lastFrameTime = now;

      // Update zero-latency data
      setZeroLatencyData(prev => ({
        ...prev,
        renderLatency: renderTime,
        frameRate: currentFPS,
        isDirectRendered: true
      }));
    });
  }, [finalConfig.enableDirectDOM, finalConfig.priceDecimalPlaces, finalConfig.targetFPS, finalConfig.animationDuration]);

  /**
   * Process price updates with zero latency
   */
  useEffect(() => {
    if (!fixData.price || fixData.price === lastPriceRef.current) return;

    const processStart = performance.now();
    
    // Send to Web Worker for background calculation
    if (workerRef.current && finalConfig.enableWebWorker) {
      workerRef.current.postMessage({
        type: 'PRICE_UPDATE',
        data: {
          price: fixData.price,
          bid: fixData.bid,
          ask: fixData.ask,
          previousPrice: lastPriceRef.current,
          timestamp: fixData.lastUpdated?.getTime() || Date.now()
        },
        timestamp: performance.now(),
        requestId: `${symbol}-${Date.now()}`
      });
    }

    // Read from shared memory if available
    let sharedData = null;
    if (sharedArrayRef.current && finalConfig.enableSharedMemory) {
      try {
        const processingFlag = sharedArrayRef.current[8];
        if (processingFlag === 0) { // Not currently being written
          sharedData = {
            price: sharedArrayRef.current[0] / 100000,
            bid: sharedArrayRef.current[1] / 100000,
            ask: sharedArrayRef.current[2] / 100000,
            change: sharedArrayRef.current[3] / 100000,
            changePercent: sharedArrayRef.current[4] / 10000,
            timestamp: sharedArrayRef.current[5]
          };
        }
      } catch (error) {
        console.warn('⚠️ Shared memory read error:', error);
      }
    }

    // Use shared data if available, otherwise use FIX data
    const priceData = sharedData || {
      price: fixData.price,
      bid: fixData.bid,
      ask: fixData.ask,
      change: fixData.change,
      changePercent: fixData.changePercent,
      timestamp: fixData.lastUpdated?.getTime() || Date.now()
    };

    // Direct DOM update with zero React re-renders
    updateDirectDOM(priceData);

    // Update React state for fallback components
    setZeroLatencyData(prev => ({
      ...prev,
      ...priceData,
      renderLatency: performance.now() - processStart
    }));

    lastPriceRef.current = fixData.price;

  }, [fixData.price, fixData.bid, fixData.ask, fixData.change, fixData.changePercent, fixData.lastUpdated, updateDirectDOM, symbol, finalConfig.enableWebWorker, finalConfig.enableSharedMemory]);

  /**
   * Force update function
   */
  const forceUpdate = useCallback(() => {
    updateDirectDOM(zeroLatencyData);
  }, [updateDirectDOM, zeroLatencyData]);

  /**
   * Get performance metrics
   */
  const getPerformanceMetrics = useCallback(() => {
    const perf = performanceRef.current;
    return {
      frameCount: perf.frameCount,
      averageRenderTime: perf.averageRenderTime,
      peakRenderTime: perf.peakRenderTime,
      droppedFrames: perf.droppedFrames,
      frameRate: perf.frameCount > 0 ? 60000 / (performance.now() - perf.lastFrameTime) : 0,
      elementsRegistered: elementsRef.current.size,
      webWorkerActive: workerRef.current !== null,
      sharedMemoryActive: sharedArrayRef.current !== null
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      elementsRef.current.clear();
      directDOMPriceRenderer.cleanup();
    };
  }, []);

  return {
    ...zeroLatencyData,
    registerElement,
    unregisterElement,
    forceUpdate,
    getPerformanceMetrics
  };
}