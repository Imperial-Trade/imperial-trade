import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  SpreadMetrics, 
  PriceValidation, 
  PriceSourceHealth, 
  calculateSpreadMetrics, 
  getPriceSourceInfo, 
  validatePrice,
  SPREAD_THRESHOLDS 
} from '@/types/priceSource';

interface PriceSourceVerificationData {
  spreadMetrics: SpreadMetrics | null;
  priceValidation: PriceValidation | null;
  sourceHealth: PriceSourceHealth;
  sourceInfo: ReturnType<typeof getPriceSourceInfo>;
  spreadAlerts: string[];
  priceAlerts: string[];
  isSpreadHealthy: boolean;
  isPriceHealthy: boolean;
}

interface PriceData {
  price: number;
  bid: number;
  ask: number;
  timestamp: number;
  source?: string;
}

export function usePriceSourceVerification(
  symbol: string,
  priceData: PriceData | null
): PriceSourceVerificationData {
  const [spreadMetrics, setSpreadMetrics] = useState<SpreadMetrics | null>(null);
  const [priceValidation, setPriceValidation] = useState<PriceValidation | null>(null);
  const [sourceHealth, setSourceHealth] = useState<PriceSourceHealth>({
    isConnected: false,
    lastUpdate: 0,
    updateFrequency: 0,
    averageLatency: 0,
    failureCount: 0,
    successRate: 100,
    dataQuality: 'poor'
  });
  const [spreadAlerts, setSpreadAlerts] = useState<string[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<string[]>([]);

  // Price history for validation
  const priceHistoryRef = useRef<number[]>([]);
  const updateTimesRef = useRef<number[]>([]);
  const lastUpdateRef = useRef<number>(0);

  // Get source information
  const sourceInfo = getPriceSourceInfo(symbol);

  // Calculate metrics when price data changes
  useEffect(() => {
    if (!priceData) {
      setSpreadMetrics(null);
      setPriceValidation(null);
      return;
    }

    const { price, bid, ask, timestamp } = priceData;

    // Calculate spread metrics
    if (bid > 0 && ask > 0 && ask > bid) {
      const metrics = calculateSpreadMetrics(bid, ask, symbol);
      setSpreadMetrics(metrics);

      // Generate spread alerts
      const alerts: string[] = [];
      const threshold = SPREAD_THRESHOLDS[symbol];
      
      if (threshold) {
        if (metrics.spreadBps > threshold.critical) {
          alerts.push(`Critical: Spread ${metrics.spread.toFixed(2)} exceeds ${threshold.critical}bps threshold`);
        } else if (metrics.spreadBps > threshold.warning) {
          alerts.push(`Warning: Spread ${metrics.spread.toFixed(2)} exceeds ${threshold.warning}bps threshold`);
        }
      }
      
      setSpreadAlerts(alerts);
    }

    // Update price history for validation
    priceHistoryRef.current.push(price);
    if (priceHistoryRef.current.length > 100) {
      priceHistoryRef.current = priceHistoryRef.current.slice(-50); // Keep last 50 prices
    }

    // Calculate historical average
    const historicalAvg = priceHistoryRef.current.length > 5 
      ? priceHistoryRef.current.reduce((sum, p) => sum + p, 0) / priceHistoryRef.current.length
      : price;

    // Validate price
    const validation = validatePrice(price, symbol, historicalAvg);
    setPriceValidation(validation);

    // Generate price alerts
    const priceAlertsArray: string[] = [];
    if (validation.isOutlier) {
      priceAlertsArray.push(`Price outlier detected: ${validation.deviationPercent.toFixed(1)}% deviation from average`);
    }
    if (validation.confidence === 'low') {
      priceAlertsArray.push('Low confidence in price data quality');
    }
    setPriceAlerts(priceAlertsArray);

    // Update health metrics
    const now = Date.now();
    updateTimesRef.current.push(now);
    if (updateTimesRef.current.length > 60) {
      updateTimesRef.current = updateTimesRef.current.slice(-30); // Keep last 30 updates
    }

    // Calculate update frequency (updates per second)
    const recentUpdates = updateTimesRef.current.filter(time => now - time < 10000); // Last 10 seconds
    const updateFrequency = recentUpdates.length / 10;

    // Calculate average latency (simplified as processing delay)
    const processingLatency = now - timestamp;
    const averageLatency = processingLatency > 0 ? processingLatency : 50; // Assume 50ms if no delay

    // Determine data quality
    let dataQuality: PriceSourceHealth['dataQuality'] = 'excellent';
    if (validation.confidence === 'low' || (spreadMetrics?.isWideSpread && spreadMetrics.spreadBps > (SPREAD_THRESHOLDS[symbol]?.critical || 100))) {
      dataQuality = 'poor';
    } else if (validation.confidence === 'medium' || updateFrequency < 1) {
      dataQuality = 'fair';
    } else if (updateFrequency < 4) {
      dataQuality = 'good';
    }

    setSourceHealth({
      isConnected: true,
      lastUpdate: timestamp,
      updateFrequency,
      averageLatency,
      failureCount: validation.isOutlier ? sourceHealth.failureCount + 1 : sourceHealth.failureCount,
      successRate: Math.max(0, 100 - (sourceHealth.failureCount / Math.max(1, priceHistoryRef.current.length)) * 100),
      dataQuality
    });

    lastUpdateRef.current = now;
  }, [priceData, symbol]);

  // Monitor connection health
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      
      // Mark as disconnected if no updates for 30 seconds
      if (timeSinceLastUpdate > 30000) {
        setSourceHealth(prev => ({
          ...prev,
          isConnected: false,
          dataQuality: 'poor'
        }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const isSpreadHealthy = !spreadMetrics?.isWideSpread;
  const isPriceHealthy = priceValidation?.confidence !== 'low' && !priceValidation?.isOutlier;

  return {
    spreadMetrics,
    priceValidation,
    sourceHealth,
    sourceInfo,
    spreadAlerts,
    priceAlerts,
    isSpreadHealthy,
    isPriceHealthy
  };
}