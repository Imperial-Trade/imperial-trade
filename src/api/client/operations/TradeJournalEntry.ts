import { enhancedApiClient } from '../EnhancedApiClient';
import { AiCoachFeedback, CoachingAnalysis } from '../types';
import { supabase } from '@/integrations/supabase/client';

export interface JournalEntry {
  id: string;
  asset_ticker: string;
  pnl: number;
  notes?: string;
  trade_date: string;
  ai_positive_feedback?: string;
  screenshot_url?: string;
  user_id: string;
  entry_price?: number;
  exit_price?: number;
  position_size?: number;
  trade_type?: 'Long' | 'Short';
  created_at: string;
  updated_at: string;
}

export class TradeJournalEntry {
  async list() {
    return enhancedApiClient.select('trade_journal_entries', {
      order: { column: 'created_at', ascending: false }
    });
  }

  async create(data: Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>) {
    return enhancedApiClient.insert('trade_journal_entries', data);
  }

  async delete(id: string) {
    return enhancedApiClient.delete('trade_journal_entries', id);
  }

  async getCoachFeedback(entryId: string, customPrompt?: string): Promise<{
    success: boolean;
    feedback: AiCoachFeedback;
    cached: boolean;
    error?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('trading-journal-ai-coach-gemeni', {
        body: {
          entryId,
          customPrompt,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get AI coaching');
      }

      return response.data;
    } catch (error) {
      console.error('Error getting AI coaching:', error);
      return {
        success: false,
        feedback: {} as AiCoachFeedback,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getCachedFeedback(entryId: string): Promise<AiCoachFeedback | null> {
    try {
      const result = await enhancedApiClient.select('ai_coach_feedback', {
        eq: { column: 'journal_entry_id', value: entryId },
        limit: 1,
      });

      if (result.success && result.data && result.data.length > 0) {
        return {
          ...result.data[0],
          coaching_analysis: result.data[0].coaching_analysis as unknown as CoachingAnalysis
        } as AiCoachFeedback;
      }

      return null;
    } catch (error) {
      console.error('Error fetching cached feedback:', error);
      return null;
    }
  }
}

export const tradeJournalEntry = new TradeJournalEntry();