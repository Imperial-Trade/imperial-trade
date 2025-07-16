
import { useState, useEffect, useRef, useCallback } from 'react';
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
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkStatusHttp = useCallback(async (emailToCheck: string) => {
    try {
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
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !email || socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/account-status-websocket`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        console.log('Account status WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Subscribe to status updates for this email
        if (email) {
          socketRef.current?.send(JSON.stringify({
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
            socketRef.current?.send(JSON.stringify({ type: 'pong' }));
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
        setIsConnected(false);
        
        // Implement exponential backoff for reconnection
        if (enabled && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('Account status WebSocket error:', error);
        setError({
          type: 'network_error',
          message: 'Connection issue detected. Switching to backup connection method.'
        });
        
        // Try HTTP fallback when WebSocket fails
        if (email) {
          checkStatusHttp(email);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError({
        type: 'network_error',
        message: 'Unable to establish connection. Please try again.'
      });
    }
  }, [email, enabled, checkStatusHttp]);

  const checkStatus = useCallback((emailToCheck: string) => {
    setIsLoading(true);
    clearError();
    
    // Try WebSocket first, fallback to HTTP if not connected
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('Checking status via WebSocket');
      socketRef.current.send(JSON.stringify({
        type: 'check_status',
        email: emailToCheck
      }));
    } else {
      console.log('WebSocket not connected, using HTTP fallback');
      checkStatusHttp(emailToCheck);
    }
  }, [checkStatusHttp, clearError]);

  const retryCheck = useCallback(() => {
    if (email) {
      checkStatus(email);
    }
  }, [email, checkStatus]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect, enabled]);

  return {
    status,
    isConnected,
    error,
    isLoading,
    checkStatus,
    retryCheck,
    clearError,
  };
};
