
import { useState, useEffect, useCallback } from 'react';

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  blockedUntil: number;
}

export const useRateLimiting = (key: string, maxAttempts: number, windowMs: number) => {
  const [canSubmit, setCanSubmit] = useState(true);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttempts);
  const [blockedUntil, setBlockedUntil] = useState<number>(0);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const getStorageKey = useCallback(() => `rate_limit_${key}`, [key]);

  const getRateLimitState = useCallback((): RateLimitState => {
    const stored = localStorage.getItem(getStorageKey());
    if (!stored) {
      return { attempts: 0, lastAttempt: 0, blockedUntil: 0 };
    }
    
    try {
      return JSON.parse(stored);
    } catch {
      return { attempts: 0, lastAttempt: 0, blockedUntil: 0 };
    }
  }, [getStorageKey]);

  const updateRateLimitState = useCallback((state: RateLimitState) => {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  }, [getStorageKey]);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const state = getRateLimitState();

    // If currently blocked, keep UI in sync with remaining time
    if (state.blockedUntil > now) {
      setCanSubmit(false);
      setAttemptsLeft(0);
      setBlockedUntil(state.blockedUntil);
      setRemainingMs(Math.max(0, state.blockedUntil - now));
      return;
    }

    // Reset attempts if window has passed
    if (now - state.lastAttempt > windowMs) {
      const newState = { attempts: 0, lastAttempt: now, blockedUntil: 0 };
      updateRateLimitState(newState);
      setCanSubmit(true);
      setAttemptsLeft(maxAttempts);
      setBlockedUntil(0);
      setRemainingMs(0);
      return;
    }

    // Check current attempts
    const remaining = maxAttempts - state.attempts;
    setAttemptsLeft(remaining);
    setCanSubmit(remaining > 0);
    setBlockedUntil(0);
    setRemainingMs(Math.max(0, state.blockedUntil - now));
  }, [getRateLimitState, updateRateLimitState, maxAttempts, windowMs]);

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    const state = getRateLimitState();
    const newAttempts = state.attempts + 1;

    const newState: RateLimitState = {
      attempts: newAttempts,
      lastAttempt: now,
      blockedUntil: newAttempts >= maxAttempts ? now + windowMs : 0,
    };

    updateRateLimitState(newState);
    checkRateLimit();
  }, [getRateLimitState, updateRateLimitState, maxAttempts, windowMs, checkRateLimit]);

  useEffect(() => {
    checkRateLimit();
    
    // Check every second to update UI countdown precisely
    const interval = setInterval(checkRateLimit, 1000);
    return () => clearInterval(interval);
  }, [checkRateLimit]);

  return {
    canSubmit,
    attemptsLeft,
    recordAttempt,
    blockedUntil,
    remainingMs,
  };
};
