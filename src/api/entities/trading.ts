import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type TradeJournalEntryRow = Database['public']['Tables']['trade_journal_entries']['Row'];
type TradeAlertRow = Database['public']['Tables']['trade_alerts']['Row'];
type TradingStrategyRow = Database['public']['Tables']['trading_strategies']['Row'];
type TradingGroupRow = Database['public']['Tables']['trading_groups']['Row'];
type GroupJournalEntryRow = Database['public']['Tables']['group_journal_entries']['Row'];
type VerifiedTraderRow = Database['public']['Tables']['verified_traders']['Row'];
type TradeHistoryRow = Database['public']['Tables']['trade_history']['Row'];

export class TradeJournalEntry {
  static tableName = 'trade_journal_entries' as const;

  static async list(orderBy = '-created_at'): Promise<TradeJournalEntryRow[]> {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<TradeJournalEntryRow> {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any): Promise<TradeJournalEntryRow> {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<TradeJournalEntryRow> {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('trade_journal_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class TradeAlert {
  static tableName = 'trade_alerts' as const;

  static async getByStatus(status: 'pending' | 'active' | 'closed'): Promise<TradeAlertRow[]> {
    const { data, error } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<TradeAlertRow[]> {
    const { data, error } = await supabase
      .from('trade_alerts')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<TradeAlertRow> {
    const { data, error } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any): Promise<TradeAlertRow> {
    const { data, error } = await supabase
      .from('trade_alerts')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<TradeAlertRow> {
    const { data, error } = await supabase
      .from('trade_alerts')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('trade_alerts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class TradingStrategy {
  static tableName = 'trading_strategies' as const;

  static async list(orderBy = '-created_at'): Promise<TradingStrategyRow[]> {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<TradingStrategyRow> {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any): Promise<TradingStrategyRow> {
    const { data, error } = await supabase
      .from('trading_strategies')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<TradingStrategyRow> {
    const { data, error } = await supabase
      .from('trading_strategies')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('trading_strategies')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class TradingGroup {
  static tableName = 'trading_groups' as const;

  static async list(orderBy = '-created_at'): Promise<TradingGroupRow[]> {
    const { data, error } = await supabase
      .from('trading_groups')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<TradingGroupRow> {
    const { data, error } = await supabase
      .from('trading_groups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any): Promise<TradingGroupRow> {
    const { data, error } = await supabase
      .from('trading_groups')
      .insert([{
        ...entityData,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<TradingGroupRow> {
    const { data, error } = await supabase
      .from('trading_groups')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('trading_groups')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class GroupJournalEntry {
  static tableName = 'group_journal_entries' as const;

  static async list(orderBy = '-created_at'): Promise<GroupJournalEntryRow[]> {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<GroupJournalEntryRow> {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any): Promise<GroupJournalEntryRow> {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<GroupJournalEntryRow> {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('group_journal_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class VerifiedTrader {
  static tableName = 'verified_traders' as const;

  static async list(orderBy = '-created_at'): Promise<VerifiedTraderRow[]> {
    const { data, error } = await supabase
      .from('verified_traders')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<VerifiedTraderRow> {
    const { data, error } = await supabase
      .from('verified_traders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any): Promise<VerifiedTraderRow> {
    const { data, error } = await supabase
      .from('verified_traders')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<VerifiedTraderRow> {
    const { data, error } = await supabase
      .from('verified_traders')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('verified_traders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class TradeHistory {
  static tableName = 'trade_history' as const;

  static async list(orderBy = '-created_at'): Promise<TradeHistoryRow[]> {
    const { data, error } = await supabase
      .from('trade_history')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<TradeHistoryRow> {
    const { data, error } = await supabase
      .from('trade_history')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any): Promise<TradeHistoryRow> {
    const { data, error } = await supabase
      .from('trade_history')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<TradeHistoryRow> {
    const { data, error } = await supabase
      .from('trade_history')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('trade_history')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
