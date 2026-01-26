import React, { useMemo } from 'react';
import { TradeEntry, TradeFormData } from '@/components/journal-xx/types';
import { JournalXX } from '@/components/journal-xx/JournalXXComponent';
import { useTradeJournal } from '@/contexts/TradeJournalContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface JournalXXProProps {
  isDarkMode: boolean;
  onExit: () => void;
  onToggleTheme: () => void;
}

export const JournalXXPro: React.FC<JournalXXProProps> = ({
  isDarkMode,
  onExit,
  onToggleTheme,
}) => {
  const { user } = useAuth();
  const { entries: journalEntries, refreshEntries } = useTradeJournal();

  const trades = useMemo(() => {
    const seenIds = new Set<string>();
    const uniqueEntries = journalEntries.filter((entry) => {
      if (seenIds.has(entry.id)) return false;
      seenIds.add(entry.id);
      return true;
    });

    return uniqueEntries.map((entry): TradeEntry => ({
      id: entry.id,
      date: entry.trade_date || new Date().toISOString().split('T')[0],
      asset: entry.asset_ticker,
      pnl: entry.pnl,
      notes: entry.notes || '',
      imageUrl: entry.screenshot_url || (entry.screenshot_urls?.[0]),
      imageUrls: entry.screenshot_urls?.length ? entry.screenshot_urls : (entry.screenshot_url ? [entry.screenshot_url] : []),
      aiFeedback: entry.ai_positive_feedback || undefined,
      direction: entry.trade_type === 'Long' ? 'Long' : entry.trade_type === 'Short' ? 'Short' : undefined,
      outcome: entry.pnl >= 0 ? 'Win' : 'Loss',
      strategy: entry.strategy || undefined,
      session: entry.session || undefined,
      emotion: entry.emotion || undefined,
      followedPlan: entry.followed_plan ?? undefined,
      revengeTrade: entry.revenge_trade ?? undefined,
      targetHitByMarket: entry.target_hit_by_market ?? undefined,
      plannedTargetPrice: entry.planned_target_price ?? undefined,
      plannedStopLoss: entry.planned_stop_loss ?? undefined,
      entryPrice: entry.entry_price ?? undefined,
      exitPrice: entry.exit_price ?? undefined,
      positionSize: entry.position_size ?? undefined,
      createdAt: entry.created_at,
      is_synced: entry.is_synced,
      broker_connection_id: entry.broker_connection_id,
    }));
  }, [journalEntries]);

  const handleSubmit = async (data: TradeFormData, existingId?: string) => {
    if (!user) return;
    try {
      const entryData = {
        user_id: user.id,
        asset_ticker: data.asset,
        trade_type: data.direction || 'Long',
        pnl: Number(data.pnl) || 0,
        notes: data.notes,
        screenshot_url: data.imageUrls?.[0] ?? null,
        screenshot_urls: data.imageUrls || [],
        trade_date: data.date,
        strategy: data.strategy || null,
        session: data.session || null,
        emotion: data.emotion || null,
        followed_plan: data.followedPlan ?? null,
        revenge_trade: data.revengeTrade ?? null,
        target_hit_by_market: data.targetHitByMarket ?? null,
        planned_target_price: data.plannedTargetPrice ?? null,
        planned_stop_loss: data.plannedStopLoss ?? null,
        entry_price: data.entryPrice ?? null,
        exit_price: data.exitPrice ?? null,
        position_size: data.positionSize ?? null,
        is_synced: false,
        sync_source: 'manual',
        broker_connection_id: null,
      };

      if (existingId) {
        await supabase.from('trade_journal_entries').update(entryData).eq('id', existingId);
      } else {
        await supabase.from('trade_journal_entries').insert(entryData);
      }
      refreshEntries();
    } catch (e) {
      console.error('Error saving trade:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('trade_journal_entries').delete().eq('id', id);
      refreshEntries();
    } catch (e) {
      console.error('Error deleting trade:', e);
    }
  };

  return (
    <JournalXX
      isDarkMode={isDarkMode}
      onExit={onExit}
      onToggleTheme={onToggleTheme}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      trades={trades}
    />
  );
};

export default JournalXXPro;
