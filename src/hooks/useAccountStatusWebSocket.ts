
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AccountStatusUpdate {
  id: string;
  email: string;
  status: string;
  full_name: string;
  account_type: string;
  created_at: string;
  rejection_reason?: string;
}

interface UseAccountStatusWebSocketProps {
  email?: string;
  enabled?: boolean;
}

interface StatusError {
  type: 'not_found' | 'network_error' | 'system_error';
  message: string;
}

export const useAccountStatusWebSocket = ({ email, enabled = true }: UseAccountStatusWebSocketProps) => {
  const [status, setStatus] = useState<AccountStatusUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<StatusError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use refs for stable references
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastCheckedEmailRef = useRef<string>('');
  const isCheckingRef = useRef(false);
  const connectionStateRef = useRef<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Memoize the clearError function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Stable HTTP check function with deduplication
  const checkStatusHttp = useCallback(async (emailToCheck: string) => {
    // Prevent duplicate requests
    if (isCheckingRef.current || lastCheckedEmailRef.current === emailToCheck) {
      console.log('Skipping duplicate request for:', emailToCheck);
      return;
    }

    try {
      isCheckingRef.current = true;
      lastCheckedEmailRef.current = emailToCheck;
      setError(null);
      setIsLoading(true);
      console.log('Checking status via HTTP API for:', emailToCheck);
      
      const { data, error } = await supabase.functions.invoke('account-status-check', {
        body: { email: emailToCheck }
      });

      if (error) {
        console.error('HTTP status check error:', error);
        setError({
          type: 'network_error',
          message: 'Unable to connect to our servers. Please check your internet connection and try again.'
        });
        return;
      }

      if (data.status === 'found') {
        setStatus(data.data);
        setError(null);
      } else if (data.status === 'not_found') {
        setStatus(null);
        setError({
          type: 'not_found',
          message: 'No account request found for this email address.'
        });
      }
    } catch (error) {
      console.error('HTTP status check failed:', error);
      setError({
        type: 'network_error',
        message: 'Connection failed. Please check your internet connection and try again.'
      });
    } finally {
      setIsLoading(false);
      // Clear the checking flag after a short delay to prevent rapid subsequent calls
      setTimeout(() => {
        isCheckingRef.current = false;
      }, 1000);
    }
  }, []);

  // Stable connect function
  const connect = useCallback(() => {
    if (!enabled || !email || connectionStateRef.current === 'connecting' || connectionStateRef.current === 'connected') {
      return;
    }

    try {
      connectionStateRef.current = 'connecting';
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/account-status-websocket`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('Account status WebSocket connected');
        connectionStateRef.current = 'connected';
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Subscribe to status updates for this email
        if (email && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'subscribe_status',
            email: email
          }));
        }
      };

      socketRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'status_update') {
            setStatus(message.data);
            setError(null);
          } else if (message.type === 'status_result') {
            const requests = message.data;
            if (requests.length > 0) {
              setStatus(requests[0]);
              setError(null);
            } else {
              setStatus(null);
              setError({
                type: 'not_found',
                message: 'No account request found for this email address.'
              });
            }
          } else if (message.type === 'status_not_found') {
            setStatus(null);
            setError({
              type: 'not_found',
              message: 'No account request found for this email address.'
            });
          } else if (message.type === 'ping') {
            // Respond to ping
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({ type: 'pong' }));
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setError({
            type: 'system_error',
            message: 'Error processing server response. Please try again.'
          });
        }
      };

      socketRef.current.onclose = () => {
        console.log('Account status WebSocket disconnected');
        connectionStateRef.current = 'disconnected';
        setIsConnected(false);
        
        // Only attempt reconnection if still enabled and have email
        if (enabled && email && reconnectAttemptsRef.current < 3) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (enabled && email) {
              connect();
            }
          }, delay);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('Account status WebSocket error:', error);
        connectionStateRef.current = 'disconnected';
        setError({
          type: 'network_error',
          message: 'Connection issue detected. Switching to backup connection method.'
        });
        
        // Try HTTP fallback when WebSocket fails, but only if not already checking
        if (email && !isCheckingRef.current) {
          setTimeout(() => checkStatusHttp(email), 1000);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      connectionStateRef.current = 'disconnected';
      setError({
        type: 'network_error',
        message: 'Unable to establish connection. Please try again.'
      });
    }
  }, [email, enabled, checkStatusHttp]);

  // Stable check status function with debouncing
  const checkStatus = useCallback((emailToCheck: string) => {
    // Clear any existing timeout to debounce rapid calls
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      setIsLoading(true);
      clearError();
      
      // Try WebSocket first, fallback to HTTP if not connected
      if (connectionStateRef.current === 'connected' && socketRef.current?.readyState === WebSocket.OPEN) {
        console.log('Checking status via WebSocket');
        socketRef.current.send(JSON.stringify({
          type: 'check_status',
          email: emailToCheck
        }));
      } else {
        console.log('WebSocket not connected, using HTTP fallback');
        checkStatusHttp(emailToCheck);
      }
    }, 300); // 300ms debounce
  }, [checkStatusHttp, clearError]);

  // Stable retry function
  const retryCheck = useCallback(() => {
    if (email) {
      checkStatus(email);
    }
  }, [email, checkStatus]);

  // Stable reset function for clearing all state
  const resetState = useCallback(() => {
    console.log('Resetting account status state');
    
    // Clear all timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Close WebSocket connection
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    // Reset all state
    setStatus(null);
    setError(null);
    setIsLoading(false);
    setIsConnected(false);
    
    // Reset refs
    connectionStateRef.current = 'disconnected';
    reconnectAttemptsRef.current = 0;
    lastCheckedEmailRef.current = '';
    isCheckingRef.current = false;
  }, []);

  // Effect for connection management
  useEffect(() => {
    if (enabled && email) {
      // Reset state when email changes
      if (lastCheckedEmailRef.current && lastCheckedEmailRef.current !== email) {
        resetState();
      }
      
      // Only connect if not already connected or connecting
      if (connectionStateRef.current === 'disconnected') {
        connect();
      }
    } else {
      // Clean up when disabled or no email
      resetState();
    }

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [email, enabled, connect, resetState]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    status,
    isConnected,
    error,
    isLoading,
    checkStatus,
    retryCheck,
    clearError,
    resetState,
  }), [status, isConnected, error, isLoading, checkStatus, retryCheck, clearError, resetState]);
};
