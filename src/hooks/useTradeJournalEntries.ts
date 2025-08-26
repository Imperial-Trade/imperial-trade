import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TradeJournalEntry } from '@/contexts/TradeJournalContext';
import { mapDbRowToEntry } from '@/features/trade-journal/normalizers';

export const useTradeJournalEntries = () => {
  const [entries, setEntries] = useState<TradeJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const refreshEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('trade_journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setEntries((data || []).map(entry => {
        const mappedEntry = mapDbRowToEntry(entry);
        return {
          ...mappedEntry,
          coach_status: (mappedEntry.ai_positive_feedback ? 'ready' : 'pending') as 'pending' | 'ready'
        };
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load journal entries';
      setError(errorMessage);
      console.error('Error loading journal entries:', err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Optimistic update functions
  const addOptimisticEntry = useCallback((entry: TradeJournalEntry) => {
    setEntries(prev => {
      // Check if entry already exists (avoid duplicates)
      const exists = prev.some(e => e.id === entry.id);
      if (exists) {
        return prev.map(e => e.id === entry.id ? entry : e);
      }
      
      // Set coach_status to 'pending' if no ai_positive_feedback exists
      const entryWithCoachStatus = {
        ...entry,
        coach_status: (!entry.ai_positive_feedback ? 'pending' : 'ready') as 'pending' | 'ready'
      };
      
      return [entryWithCoachStatus, ...prev];
    });
  }, []);

  const updateOptimisticEntry = useCallback((id: string, updates: Partial<TradeJournalEntry>) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        const updatedEntry = { ...entry, ...updates };
        
        // If ai_positive_feedback is being set, update coach_status to 'ready'
        if (updates.ai_positive_feedback && updates.ai_positive_feedback.trim()) {
          updatedEntry.coach_status = 'ready';
        }
        
        return updatedEntry;
      }
      return entry;
    }));
  }, []);

  const removeOptimisticEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  }, []);

  // Initial load
  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unified-trade-journal-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_journal_entries',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newEntry = mapDbRowToEntry(payload.new);
            addOptimisticEntry(newEntry);
          } else if (payload.eventType === 'UPDATE') {
            const updatedEntry = mapDbRowToEntry(payload.new);
            updateOptimisticEntry(updatedEntry.id, updatedEntry);
          } else if (payload.eventType === 'DELETE') {
            const deletedEntry = payload.old as TradeJournalEntry;
            removeOptimisticEntry(deletedEntry.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, addOptimisticEntry, updateOptimisticEntry, removeOptimisticEntry]);

  return {
    entries,
    isLoading,
    error,
    refreshEntries,
    addOptimisticEntry,
    updateOptimisticEntry,
    removeOptimisticEntry,
  };
};