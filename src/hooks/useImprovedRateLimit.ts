
import { useState, useEffect, useCallback } from 'react';
import { serverRateLimitService } from '@/services/ServerRateLimitService';

interface ImprovedRateLimitConfig {
  identifier: string;
  email?: string;
  maxAttempts?: number;
  windowMs?: number;
}

interface RateLimitState {
  canSubmit: boolean;
  attemptsLeft: number;
  nextAttemptDelay: number;
  resetTime?: string;
  isLoading: boolean;
  message: string;
}

export const useImprovedRateLimit = (config: ImprovedRateLimitConfig) => {
  const [state, setState] = useState<RateLimitState>({
    canSubmit: true,
    attemptsLeft: 5,
    nextAttemptDelay: 0,
    isLoading: false,
    message: '',
  });

  // Generate a session-based identifier instead of using localStorage
  const getSessionIdentifier = useCallback(() => {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return `${config.identifier}_${sessionId}`;
  }, [config.identifier]);

  const checkRateLimit = useCallback(async () => {
    if (!config.email) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Check server-side rate limits
      const emailCheck = await serverRateLimitService.checkEmailRateLimit(config.email);
      const ipCheck = await serverRateLimitService.checkIPRateLimit(
        serverRateLimitService.getClientIP()
      );

      const canSubmit = emailCheck.allowed && ipCheck.allowed;
      const attemptsLeft = Math.min(emailCheck.attemptsRemaining, ipCheck.attemptsRemaining);
      
      let message = '';
      let nextAttemptDelay = 0;

      if (!canSubmit) {
        if (!emailCheck.allowed) {
          message = 'This email has already been used today. Please try again tomorrow.';
          nextAttemptDelay = new Date(emailCheck.resetTime).getTime() - Date.now();
        } else if (!ipCheck.allowed) {
          message = 'Too many requests from this location. Please try again in an hour.';
          nextAttemptDelay = new Date(ipCheck.resetTime).getTime() - Date.now();
        }
      } else if (attemptsLeft < 5) {
        message = `${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining`;
      }

      setState({
        canSubmit,
        attemptsLeft,
        nextAttemptDelay,
        resetTime: !canSubmit ? (emailCheck.resetTime || ipCheck.resetTime) : undefined,
        isLoading: false,
        message,
      });

    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow submission if rate limit check fails
      setState({
        canSubmit: true,
        attemptsLeft: 5,
        nextAttemptDelay: 0,
        isLoading: false,
        message: '',
      });
    }
  }, [config.email]);

  const recordAttempt = useCallback(async () => {
    // The server-side rate limiting will be handled by the submission endpoint
    await checkRateLimit();
  }, [checkRateLimit]);

  const getDelayMessage = useCallback((delay: number): string => {
    if (delay <= 0) return '';
    
    const minutes = Math.ceil(delay / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `Please wait ${hours}h ${remainingMinutes}m before trying again`;
    }
    return `Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before trying again`;
  }, []);

  const clearRateLimit = useCallback(() => {
    // Admin function to clear rate limits
    setState({
      canSubmit: true,
      attemptsLeft: 5,
      nextAttemptDelay: 0,
      isLoading: false,
      message: '',
    });
  }, []);

  useEffect(() => {
    checkRateLimit();
  }, [checkRateLimit]);

  return {
    ...state,
    recordAttempt,
    getDelayMessage,
    clearRateLimit,
    refresh: checkRateLimit,
  };
};
