import { useEffect, useRef, useCallback, useState } from 'react';

interface APIKeyRotationConfig {
  primary_key?: string;
  backup_keys?: string[];
  rotation_interval?: number; // milliseconds
  health_check_interval?: number; // milliseconds
  max_requests_per_key?: number;
}

interface APIKeyStatus {
  key: string;
  isActive: boolean;
  requestCount: number;
  lastUsed: number;
  errorCount: number;
  isHealthy: boolean;
}

/**
 * Professional trading API key rotation system
 * Provides automatic failover, load balancing, and health monitoring
 */
export function useTradingAPIKeyRotation(config: APIKeyRotationConfig = {}) {
  const {
    primary_key = '',
    backup_keys = [],
    rotation_interval = 60000, // 1 minute
    health_check_interval = 30000, // 30 seconds
    max_requests_per_key = 100
  } = config;

  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [keyStatuses, setKeyStatuses] = useState<APIKeyStatus[]>([]);
  const rotationTimerRef = useRef<NodeJS.Timeout>();
  const healthCheckTimerRef = useRef<NodeJS.Timeout>();
  const requestCountsRef = useRef<Map<string, number>>(new Map());

  // All available keys (primary + backups)
  const allKeys = [primary_key, ...backup_keys].filter(Boolean);

  /**
   * Initialize key statuses
   */
  const initializeKeyStatuses = useCallback(() => {
    const statuses = allKeys.map((key, index) => ({
      key: key.substring(0, 8) + '...', // Masked for security
      isActive: index === 0,
      requestCount: 0,
      lastUsed: 0,
      errorCount: 0,
      isHealthy: true
    }));
    setKeyStatuses(statuses);
  }, [allKeys]);

  /**
   * Get the current active API key
   */
  const getCurrentKey = useCallback((): string => {
    return allKeys[currentKeyIndex] || '';
  }, [allKeys, currentKeyIndex]);

  /**
   * Record successful API request
   */
  const recordSuccess = useCallback((key: string) => {
    const currentCount = requestCountsRef.current.get(key) || 0;
    requestCountsRef.current.set(key, currentCount + 1);

    setKeyStatuses(prev => prev.map((status, index) => {
      if (allKeys[index] === key) {
        return {
          ...status,
          requestCount: currentCount + 1,
          lastUsed: Date.now(),
          isHealthy: true
        };
      }
      return status;
    }));
  }, [allKeys]);

  /**
   * Record API request error
   */
  const recordError = useCallback((key: string, error: any) => {
    console.error(`API key error for ${key.substring(0, 8)}...`, error);

    setKeyStatuses(prev => prev.map((status, index) => {
      if (allKeys[index] === key) {
        const newErrorCount = status.errorCount + 1;
        return {
          ...status,
          errorCount: newErrorCount,
          isHealthy: newErrorCount < 5, // Unhealthy after 5 errors
          lastUsed: Date.now()
        };
      }
      return status;
    }));

    // Auto-rotate to next key if current key is failing
    if (allKeys[currentKeyIndex] === key) {
      rotateToNextHealthyKey();
    }
  }, [allKeys, currentKeyIndex]);

  /**
   * Rotate to next healthy API key
   */
  const rotateToNextHealthyKey = useCallback(() => {
    const healthyKeyIndex = keyStatuses.findIndex((status, index) => 
      index !== currentKeyIndex && status.isHealthy
    );

    if (healthyKeyIndex !== -1) {
      console.log(`🔄 Rotating from key ${currentKeyIndex} to key ${healthyKeyIndex}`);
      setCurrentKeyIndex(healthyKeyIndex);
      
      // Update active status
      setKeyStatuses(prev => prev.map((status, index) => ({
        ...status,
        isActive: index === healthyKeyIndex
      })));
    } else {
      console.warn('⚠️ No healthy API keys available for rotation');
    }
  }, [keyStatuses, currentKeyIndex]);

  /**
   * Smart rotation based on usage and health
   */
  const performSmartRotation = useCallback(() => {
    const currentKey = allKeys[currentKeyIndex];
    const currentRequests = requestCountsRef.current.get(currentKey) || 0;

    // Rotate if current key has reached request limit
    if (currentRequests >= max_requests_per_key) {
      console.log(`📊 Key ${currentKeyIndex} reached request limit (${currentRequests}), rotating...`);
      rotateToNextHealthyKey();
      
      // Reset request count for rotated key
      requestCountsRef.current.set(currentKey, 0);
    }
    // Rotate based on time interval for load balancing
    else if (allKeys.length > 1) {
      const nextIndex = (currentKeyIndex + 1) % allKeys.length;
      const nextKeyStatus = keyStatuses[nextIndex];
      
      if (nextKeyStatus?.isHealthy) {
        console.log(`⏰ Time-based rotation to key ${nextIndex}`);
        setCurrentKeyIndex(nextIndex);
        
        setKeyStatuses(prev => prev.map((status, index) => ({
          ...status,
          isActive: index === nextIndex
        })));
      }
    }
  }, [allKeys, currentKeyIndex, max_requests_per_key, keyStatuses, rotateToNextHealthyKey]);

  /**
   * Health check for API keys
   */
  const performHealthCheck = useCallback(async () => {
    console.log('🏥 Performing API key health check...');
    
    // Reset error counts periodically to allow recovery
    setKeyStatuses(prev => prev.map(status => ({
      ...status,
      errorCount: Math.max(0, status.errorCount - 1), // Gradual error recovery
      isHealthy: status.errorCount <= 3 // Recover if errors are low
    })));

    // Reset request counts every health check
    requestCountsRef.current.clear();
  }, []);

  /**
   * Enhanced fetch with automatic key rotation and retry
   */
  const fetchWithRotation = useCallback(async (url: string, options: RequestInit = {}) => {
    let lastError: any;
    const maxRetries = Math.min(allKeys.length, 3);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const currentKey = getCurrentKey();
      
      if (!currentKey) {
        throw new Error('No API keys available');
      }

      try {
        const enhancedUrl = url.includes('?') 
          ? `${url}&api_key=${currentKey}`
          : `${url}?api_key=${currentKey}`;

        const response = await fetch(enhancedUrl, {
          ...options,
          headers: {
            'User-Agent': 'Imperial-Trading-Platform',
            'Content-Type': 'application/json',
            ...options.headers
          }
        });

        if (response.ok) {
          recordSuccess(currentKey);
          return response;
        } else if (response.status === 429 || response.status === 403) {
          // Rate limited or forbidden - try next key
          recordError(currentKey, new Error(`HTTP ${response.status}`));
          rotateToNextHealthyKey();
          lastError = new Error(`API key rate limited: ${response.status}`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        recordError(currentKey, error);
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          rotateToNextHealthyKey();
          // Wait briefly before retry
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('All API keys failed');
  }, [allKeys, getCurrentKey, recordSuccess, recordError, rotateToNextHealthyKey]);

  // Initialize and start timers
  useEffect(() => {
    if (allKeys.length === 0) return;

    initializeKeyStatuses();

    // Set up rotation timer
    rotationTimerRef.current = setInterval(performSmartRotation, rotation_interval);
    
    // Set up health check timer
    healthCheckTimerRef.current = setInterval(performHealthCheck, health_check_interval);

    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
      }
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
      }
    };
  }, [allKeys.length, initializeKeyStatuses, performSmartRotation, performHealthCheck, rotation_interval, health_check_interval]);

  return {
    getCurrentKey,
    fetchWithRotation,
    recordSuccess,
    recordError,
    rotateToNextHealthyKey,
    keyStatuses,
    currentKeyIndex,
    isOperational: keyStatuses.some(status => status.isHealthy),
    totalKeys: allKeys.length,
    healthyKeys: keyStatuses.filter(status => status.isHealthy).length
  };
}