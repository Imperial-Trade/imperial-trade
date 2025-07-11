
import { useState, useEffect, useCallback } from 'react';

interface ProgressiveRateLimitState {
  attempts: number;
  lastAttempt: number;
  blockedUntil: number;
  delayProgression: number[];
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  progressiveDelays: number[]; // Delays in milliseconds for each attempt
  recoveryRate: number; // How often to recover an attempt (ms)
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 10 * 60 * 1000, // 10 minutes
  progressiveDelays: [0, 30000, 120000, 300000, 600000], // 0s, 30s, 2m, 5m, 10m
  recoveryRate: 2 * 60 * 1000, // Recover 1 attempt every 2 minutes
};

export const useProgressiveRateLimiting = (
  key: string,
  config: Partial<RateLimitConfig> = {}
) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const [canSubmit, setCanSubmit] = useState(true);
  const [attemptsLeft, setAttemptsLeft] = useState(fullConfig.maxAttempts);
  const [nextAttemptDelay, setNextAttemptDelay] = useState(0);
  const [timeUntilRecovery, setTimeUntilRecovery] = useState(0);

  const getStorageKey = useCallback(() => `progressive_rate_limit_${key}`, [key]);

  const getRateLimitState = useCallback((): ProgressiveRateLimitState => {
    const stored = localStorage.getItem(getStorageKey());
    if (!stored) {
      return {
        attempts: 0,
        lastAttempt: 0,
        blockedUntil: 0,
        delayProgression: [],
      };
    }
    
    try {
      return JSON.parse(stored);
    } catch {
      return {
        attempts: 0,
        lastAttempt: 0,
        blockedUntil: 0,
        delayProgression: [],
      };
    }
  }, [getStorageKey]);

  const updateRateLimitState = useCallback((state: ProgressiveRateLimitState) => {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  }, [getStorageKey]);

  const calculateRecoveredAttempts = useCallback((state: ProgressiveRateLimitState) => {
    const now = Date.now();
    const timeSinceLastAttempt = now - state.lastAttempt;
    const recoveryPeriods = Math.floor(timeSinceLastAttempt / fullConfig.recoveryRate);
    
    if (recoveryPeriods > 0) {
      const newAttempts = Math.max(0, state.attempts - recoveryPeriods);
      return {
        ...state,
        attempts: newAttempts,
        lastAttempt: now - (timeSinceLastAttempt % fullConfig.recoveryRate),
      };
    }
    
    return state;
  }, [fullConfig.recoveryRate]);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    let state = getRateLimitState();
    
    // Apply recovery mechanism
    state = calculateRecoveredAttempts(state);

    // Check if currently blocked
    if (state.blockedUntil > now) {
      setCanSubmit(false);
      setAttemptsLeft(0);
      setNextAttemptDelay(state.blockedUntil - now);
      setTimeUntilRecovery(state.blockedUntil - now);
      return;
    }

    // Reset if window has passed completely
    if (now - state.lastAttempt > fullConfig.windowMs && state.attempts === 0) {
      const newState = {
        attempts: 0,
        lastAttempt: now,
        blockedUntil: 0,
        delayProgression: [],
      };
      updateRateLimitState(newState);
      setCanSubmit(true);
      setAttemptsLeft(fullConfig.maxAttempts);
      setNextAttemptDelay(0);
      setTimeUntilRecovery(0);
      return;
    }

    // Calculate current state
    const remaining = fullConfig.maxAttempts - state.attempts;
    const nextDelay = state.attempts < fullConfig.progressiveDelays.length 
      ? fullConfig.progressiveDelays[state.attempts] 
      : fullConfig.progressiveDelays[fullConfig.progressiveDelays.length - 1];

    // Calculate time until next recovery
    const timeSinceLastAttempt = now - state.lastAttempt;
    const timeToNextRecovery = fullConfig.recoveryRate - (timeSinceLastAttempt % fullConfig.recoveryRate);

    setAttemptsLeft(remaining);
    setCanSubmit(remaining > 0);
    setNextAttemptDelay(nextDelay);
    setTimeUntilRecovery(state.attempts > 0 ? timeToNextRecovery : 0);

    // Update stored state
    updateRateLimitState(state);
  }, [getRateLimitState, calculateRecoveredAttempts, updateRateLimitState, fullConfig]);

  const recordAttempt = useCallback(async (): Promise<void> => {
    const now = Date.now();
    let state = getRateLimitState();
    
    // Apply recovery before recording new attempt
    state = calculateRecoveredAttempts(state);
    
    const newAttempts = state.attempts + 1;
    const delay = newAttempts < fullConfig.progressiveDelays.length 
      ? fullConfig.progressiveDelays[newAttempts] 
      : fullConfig.progressiveDelays[fullConfig.progressiveDelays.length - 1];

    const newState: ProgressiveRateLimitState = {
      attempts: newAttempts,
      lastAttempt: now,
      blockedUntil: newAttempts >= fullConfig.maxAttempts ? now + delay : 0,
      delayProgression: [...state.delayProgression, delay],
    };

    updateRateLimitState(newState);
    
    // Apply progressive delay
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    checkRateLimit();
  }, [getRateLimitState, calculateRecoveredAttempts, updateRateLimitState, fullConfig, checkRateLimit]);

  const getDelayMessage = useCallback((delay: number): string => {
    if (delay === 0) return '';
    
    const seconds = Math.ceil(delay / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `Please wait ${minutes}m ${remainingSeconds}s before trying again`;
    }
    return `Please wait ${seconds}s before trying again`;
  }, []);

  useEffect(() => {
    checkRateLimit();
    
    // Check every 30 seconds to update UI
    const interval = setInterval(checkRateLimit, 30000);
    return () => clearInterval(interval);
  }, [checkRateLimit]);

  return {
    canSubmit,
    attemptsLeft,
    nextAttemptDelay,
    timeUntilRecovery,
    recordAttempt,
    getDelayMessage,
    maxAttempts: fullConfig.maxAttempts,
  };
};
