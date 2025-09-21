
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AccountRequest } from '@/api/entities';

export const useRealTimeRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [newRequestCount, setNewRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AccountRequest.list();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();

    const channelId = `acct-req-${Date.now()}-${Math.random().toString(36).slice(-4)}`;
    
    // Set up real-time subscription
    const channel = supabase
      .channel('account_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'account_requests'
        },
        (payload) => {
          console.log('Account request INSERT:', payload);
          
          if (payload.eventType === 'INSERT') {
            setNewRequestCount(prev => prev + 1);
            setRequests(prev => [payload.new, ...prev]);
            
            // Send notification to admin
            supabase.functions.invoke('account-request-notifications', {
              body: {
                type: 'new_request',
                userEmail: payload.new.email,
                userName: payload.new.full_name
              }
            }).catch(console.error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'account_requests',
          filter: 'status=in.(pending,approved,rejected)'
        },
        (payload) => {
          console.log('Account request UPDATE:', payload);
          
          if (payload.eventType === 'UPDATE') {
            setRequests(prev => 
              prev.map(req => 
                req.id === payload.new.id ? payload.new : req
              )
            );
            
            // Check if it's a resubmission
            if (payload.old.status === 'rejected' && payload.new.status === 'pending') {
              supabase.functions.invoke('account-request-notifications', {
                body: {
                  type: 'request_resubmitted',
                  requestId: payload.new.id,
                  userEmail: payload.new.email,
                  userName: payload.new.full_name
                }
              }).catch(console.error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'account_requests'
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setRequests(prev => prev.filter(req => req.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`WS-REQUESTS: SUBSCRIBE [${channelId}] name=account_requests_changes`);
        }
      });

    return () => {
      console.log(`WS-REQUESTS: UNSUBSCRIBE [${channelId}]`);
      supabase.removeChannel(channel);
    };
  }, [loadRequests]);

  const clearNewRequestCount = useCallback(() => {
    setNewRequestCount(0);
  }, []);

  return {
    requests,
    newRequestCount,
    loading,
    loadRequests,
    clearNewRequestCount
  };
};
