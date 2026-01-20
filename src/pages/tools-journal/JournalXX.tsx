import React, { useMemo } from 'react';
import { TradeEntry, TradeFormData } from '@/components/journal-xx/types';
import { JournalXX as JournalXXComponent } from '@/components/journal-xx/JournalXXComponent';
import { useTheme } from '@/contexts/SafeThemeProvider';
import { useTradeJournal } from '@/contexts/TradeJournalContext';
import { useAuth } from '@/contexts/AuthContext';
import { TradeJournalEntry as TJEntry } from '@/api/entities';
import { supabase } from '@/integrations/supabase/client';

/**
 * Format a date string (YYYY-MM-DD) for display without timezone issues
 * Creates a local Date object to avoid UTC conversion shifting dates
 */
const formatDateForDisplay = (dateStr: string): string => {
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString();
};

export default function JournalXXPage() {
  // Use the app's global theme system for synchronization
  const { theme, toggleTheme: appToggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  
  // Load trades from Supabase
  const { entries: journalEntries, isLoading: isLoadingEntries, refreshEntries } = useTradeJournal();
  
  // Map Supabase entries to TradeEntry format
  const trades = useMemo(() => {
    // Debug: Log raw journal entries from database
    if (journalEntries.length > 0) {
      console.log('🔍 JournalXX: Received', journalEntries.length, 'journal entries from database');
    }
    
    // Deduplicate journal entries by ID before mapping
    const seenIds = new Set<string>();
    const uniqueEntries = journalEntries.filter(entry => {
      if (seenIds.has(entry.id)) {
        console.warn(`⚠️ JournalXX: Duplicate journal entry detected: ${entry.id} - ${entry.asset_ticker}. Skipping duplicate.`);
        return false;
      }
      seenIds.add(entry.id);
      return true;
    });
    
    const mappedTrades = uniqueEntries.map((entry): TradeEntry => ({
      id: entry.id,
      date: entry.trade_date || new Date().toISOString().split('T')[0],
      asset: entry.asset_ticker,
      pnl: entry.pnl,
      notes: entry.notes || '',
      imageUrl: entry.screenshot_url || (entry.screenshot_urls && entry.screenshot_urls.length > 0 ? entry.screenshot_urls[0] : undefined),
      imageUrls: entry.screenshot_urls && entry.screenshot_urls.length > 0 ? entry.screenshot_urls : (entry.screenshot_url ? [entry.screenshot_url] : []),
      aiFeedback: entry.ai_positive_feedback || undefined,
      direction: entry.trade_type === 'Long' ? 'Long' : entry.trade_type === 'Short' ? 'Short' : undefined,
      outcome: entry.pnl >= 0 ? 'Win' : 'Loss',
      strategy: entry.strategy || undefined,
      session: entry.session || undefined,
      emotion: entry.emotion || undefined,
      followedPlan: entry.followed_plan !== null && entry.followed_plan !== undefined ? entry.followed_plan : undefined,
      revengeTrade: entry.revenge_trade !== null && entry.revenge_trade !== undefined ? entry.revenge_trade : undefined,
      targetHitByMarket: entry.target_hit_by_market !== null && entry.target_hit_by_market !== undefined ? entry.target_hit_by_market : undefined,
      plannedTargetPrice: entry.planned_target_price !== null && entry.planned_target_price !== undefined ? entry.planned_target_price : undefined,
      plannedStopLoss: entry.planned_stop_loss !== null && entry.planned_stop_loss !== undefined ? entry.planned_stop_loss : undefined,
      entryPrice: entry.entry_price !== null && entry.entry_price !== undefined ? entry.entry_price : undefined,
      exitPrice: entry.exit_price !== null && entry.exit_price !== undefined ? entry.exit_price : undefined,
      positionSize: entry.position_size !== null && entry.position_size !== undefined ? entry.position_size : undefined,
      createdAt: entry.created_at,
      is_synced: entry.is_synced,
      broker_connection_id: entry.broker_connection_id,
    }));
    
    return mappedTrades;
  }, [journalEntries]);

  const handleSubmit = async (data: TradeFormData, existingId?: string) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }
    
    try {
      const entryData = {
        user_id: user.id,
        asset_ticker: data.asset,
        trade_type: data.direction || 'Long',
        pnl: data.pnl,
        notes: data.notes,
        screenshot_url: data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls[0] : null,
        screenshot_urls: data.imageUrls || [],
        trade_date: data.date,
        strategy: data.strategy || null,
        session: data.session || null,
        emotion: data.emotion || null,
        followed_plan: data.followedPlan !== undefined ? data.followedPlan : null,
        revenge_trade: data.revengeTrade !== undefined ? data.revengeTrade : null,
        target_hit_by_market: data.targetHitByMarket !== undefined ? data.targetHitByMarket : null,
        planned_target_price: data.plannedTargetPrice !== undefined ? data.plannedTargetPrice : null,
        planned_stop_loss: data.plannedStopLoss !== undefined ? data.plannedStopLoss : null,
        entry_price: data.entryPrice !== undefined ? data.entryPrice : null,
        exit_price: data.exitPrice !== undefined ? data.exitPrice : null,
        position_size: data.positionSize !== undefined ? data.positionSize : null,
        // CRITICAL: Mark as MANUAL trade (separate from auto journal)
        is_synced: false,
        sync_source: 'manual',
        broker_connection_id: null,
      };

      if (existingId) {
        const { error } = await supabase
          .from('trade_journal_entries')
          .update(entryData)
          .eq('id', existingId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trade_journal_entries')
          .insert(entryData);
        
        if (error) throw error;
      }
      
      refreshEntries();
    } catch (error) {
      console.error('Error saving trade:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trade_journal_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      refreshEntries();
    } catch (error) {
      console.error('Error deleting trade:', error);
    }
  };

  const handleExit = () => {
    window.history.back();
  };

  return (
    <JournalXXComponent
      isDarkMode={isDarkMode}
      onExit={handleExit}
      onToggleTheme={appToggleTheme}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      trades={trades}
    />
  );
}
