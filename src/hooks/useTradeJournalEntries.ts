import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TradeJournalEntry } from '@/contexts/TradeJournalContext';

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

      setEntries(data || []);
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
      return [entry, ...prev];
    });
  }, []);

  const updateOptimisticEntry = useCallback((id: string, updates: Partial<TradeJournalEntry>) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, ...updates } : entry
    ));
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

    console.log('🔄 Setting up unified realtime subscription for trade_journal_entries');
    
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
          console.log('🔔 Unified realtime update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newEntry = payload.new as TradeJournalEntry;
            console.log('➕ New entry via unified realtime:', newEntry);
            addOptimisticEntry(newEntry);
          } else if (payload.eventType === 'UPDATE') {
            const updatedEntry = payload.new as TradeJournalEntry;
            console.log('📝 Updated entry via unified realtime:', updatedEntry);
            updateOptimisticEntry(updatedEntry.id, updatedEntry);
          } else if (payload.eventType === 'DELETE') {
            const deletedEntry = payload.old as TradeJournalEntry;
            console.log('🗑️ Deleted entry via unified realtime:', deletedEntry);
            removeOptimisticEntry(deletedEntry.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Unified realtime subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up unified realtime subscription');
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